'use server';

import { generateSupportBundle as runBundle, type BundleResult } from '@/lib/supportBundle';

export async function generateSupportBundle(): Promise<BundleResult> {
  try {
    return await runBundle();
  } catch (err) {
    return {
      success: false,
      output: err instanceof Error ? err.message : 'Failed to generate support bundle',
    };
  }
}
