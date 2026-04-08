import { NextResponse } from 'next/server';
import { createSupportBundleJob, getJobStatus, getJobLogs } from '@/lib/k8s';

const RELEASE_NAME = process.env.HELM_RELEASE_NAME || 'didnotreadit';
const SDK_SERVICE = process.env.REPLICATED_SDK_SERVICE || 'didnotreadit-sdk';

export async function POST() {
  try {
    const job = await createSupportBundleJob(RELEASE_NAME, SDK_SERVICE);
    return NextResponse.json({ jobName: job.name, namespace: job.namespace });
  } catch (err) {
    console.error('[support-bundle] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create job' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobName = url.searchParams.get('job');
  if (!jobName) {
    return NextResponse.json({ error: 'Missing job parameter' }, { status: 400 });
  }

  const status = await getJobStatus(jobName);
  let logs: string | undefined;
  if (status.phase === 'succeeded' || status.phase === 'failed') {
    logs = await getJobLogs(jobName);
  }
  return NextResponse.json({ ...status, logs });
}
