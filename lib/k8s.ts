import fs from 'fs';
import path from 'path';

const SA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount';
const API_HOST = 'https://kubernetes.default.svc';

function getToken(): string {
  return fs.readFileSync(path.join(SA_PATH, 'token'), 'utf-8');
}

function getNamespace(): string {
  return fs.readFileSync(path.join(SA_PATH, 'namespace'), 'utf-8');
}

function getCACert(): string {
  return fs.readFileSync(path.join(SA_PATH, 'ca.crt'), 'utf-8');
}

async function k8sRequest(method: string, urlPath: string, body?: object): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  // Use https.request for in-cluster TLS with custom CA
  const https = await import('https');
  const url = new URL(`${API_HOST}${urlPath}`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers,
        ca: getCACert(),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString();
          resolve(new Response(bodyText, {
            status: res.statusCode || 500,
            headers: res.headers as Record<string, string>,
          }));
        });
      },
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

export interface SupportBundleJob {
  name: string;
  namespace: string;
}

export async function createSupportBundleJob(
  releaseName: string,
  sdkServiceName: string,
): Promise<SupportBundleJob> {
  const namespace = getNamespace();
  const jobName = `support-bundle-${Date.now()}`;

  const job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace,
      labels: {
        'app.kubernetes.io/component': 'support-bundle',
        'app.kubernetes.io/managed-by': releaseName,
      },
    },
    spec: {
      ttlSecondsAfterFinished: 600,
      backoffLimit: 0,
      template: {
        spec: {
          serviceAccountName: `${releaseName}-support-bundle`,
          restartPolicy: 'Never',
          imagePullSecrets: [{ name: 'enterprise-pull-secret' }],
          initContainers: [
            {
              name: 'collect',
              image: 'replicated/troubleshoot:latest',
              command: ['sh', '-c'],
              args: [
                'support-bundle --interactive=false -o /output/bundle.tar.gz --load-cluster-specs 2>&1',
              ],
              volumeMounts: [{ name: 'output', mountPath: '/output' }],
            },
          ],
          containers: [
            {
              name: 'upload',
              image: 'curlimages/curl:latest',
              command: ['sh', '-c'],
              args: [
                [
                  'echo "Uploading support bundle..."',
                  `curl -sf -X POST -H "Content-Type: application/gzip" -H "Content-Length: $(stat -c%s /output/bundle.tar.gz)" --data-binary @/output/bundle.tar.gz http://${sdkServiceName}:3000/api/v1/supportbundle`,
                  'echo ""',
                  'echo "Upload complete"',
                ].join(' && '),
              ],
              volumeMounts: [{ name: 'output', mountPath: '/output' }],
            },
          ],
          volumes: [{ name: 'output', emptyDir: {} }],
        },
      },
    },
  };

  const res = await k8sRequest('POST', `/apis/batch/v1/namespaces/${namespace}/jobs`, job);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create support bundle job: ${err}`);
  }

  return { name: jobName, namespace };
}

export interface JobStatus {
  phase: 'running' | 'succeeded' | 'failed' | 'unknown';
  message?: string;
}

export async function getJobStatus(jobName: string): Promise<JobStatus> {
  const namespace = getNamespace();
  const res = await k8sRequest('GET', `/apis/batch/v1/namespaces/${namespace}/jobs/${jobName}`);
  if (!res.ok) {
    return { phase: 'unknown', message: `Failed to get job: ${res.status}` };
  }

  const job = await res.json();
  const conditions = job.status?.conditions || [];

  for (const c of conditions) {
    if (c.type === 'Complete' && c.status === 'True') {
      return { phase: 'succeeded' };
    }
    if (c.type === 'Failed' && c.status === 'True') {
      return { phase: 'failed', message: c.reason || 'Job failed' };
    }
  }

  return { phase: 'running' };
}

export async function getJobLogs(jobName: string): Promise<string> {
  const namespace = getNamespace();

  // Find the pod for this job
  const podsRes = await k8sRequest(
    'GET',
    `/api/v1/namespaces/${namespace}/pods?labelSelector=job-name=${jobName}`,
  );
  if (!podsRes.ok) return '';

  const pods = await podsRes.json();
  const podName = pods.items?.[0]?.metadata?.name;
  if (!podName) return '';

  const logsRes = await k8sRequest(
    'GET',
    `/api/v1/namespaces/${namespace}/pods/${podName}/log?container=upload&tailLines=50`,
  );
  if (!logsRes.ok) return '';

  return logsRes.text();
}

export async function cleanupOldJobs(): Promise<void> {
  const namespace = getNamespace();
  const res = await k8sRequest(
    'GET',
    `/apis/batch/v1/namespaces/${namespace}/jobs?labelSelector=app.kubernetes.io/component=support-bundle`,
  );
  if (!res.ok) return;

  const jobs = await res.json();
  for (const job of jobs.items || []) {
    const name = job.metadata?.name;
    if (!name) continue;
    // Delete completed/failed jobs older than 5 minutes
    const completionTime = job.status?.completionTime || job.status?.conditions?.[0]?.lastTransitionTime;
    if (completionTime) {
      const age = Date.now() - new Date(completionTime).getTime();
      if (age > 5 * 60 * 1000) {
        await k8sRequest('DELETE', `/apis/batch/v1/namespaces/${namespace}/jobs/${name}?propagationPolicy=Background`);
      }
    }
  }
}
