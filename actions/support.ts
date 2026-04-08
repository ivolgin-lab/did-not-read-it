'use server';

import { createSupportBundleJob, getJobStatus, getJobLogs, cleanupOldJobs } from '@/lib/k8s';

const RELEASE_NAME = process.env.HELM_RELEASE_NAME || 'didnotreadit';
const SDK_SERVICE = process.env.REPLICATED_SDK_SERVICE || 'didnotreadit-sdk';

export async function generateSupportBundle(): Promise<{ jobName: string } | { error: string }> {
  try {
    await cleanupOldJobs();
    const job = await createSupportBundleJob(RELEASE_NAME, SDK_SERVICE);
    return { jobName: job.name };
  } catch (err) {
    console.error('[support] failed to create support bundle job:', err);
    return { error: err instanceof Error ? err.message : 'Failed to create support bundle job' };
  }
}

export async function checkBundleStatus(
  jobName: string,
): Promise<{ phase: string; message?: string; logs?: string }> {
  try {
    const status = await getJobStatus(jobName);
    let logs: string | undefined;
    if (status.phase === 'succeeded' || status.phase === 'failed') {
      logs = await getJobLogs(jobName);
    }
    return { ...status, logs };
  } catch (err) {
    console.error('[support] failed to check bundle status:', err);
    return { phase: 'unknown', message: 'Failed to check status' };
  }
}
