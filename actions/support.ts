'use server';

import { getStatus, startSupportBundle, type BundleStatus } from '@/lib/supportBundle';

export async function startBundle(): Promise<{ started: boolean; status: BundleStatus }> {
  return startSupportBundle();
}

export async function fetchBundleStatus(): Promise<BundleStatus> {
  return getStatus();
}
