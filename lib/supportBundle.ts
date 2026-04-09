import { spawn } from 'child_process';

export interface BundleResult {
  success: boolean;
  output: string;
}

// Runs the troubleshoot `support-bundle` binary that ships in the app image.
// `--load-cluster-specs` discovers all SupportBundle specs labeled
// `troubleshoot.sh/kind=support-bundle` in the cluster (ours + the SDK's),
// and the spec's `afterCollection.uploadResultsTo` handles the upload to the
// Replicated SDK — no curl, no Job, no extra container images.
export async function generateSupportBundle(): Promise<BundleResult> {
  return new Promise((resolve) => {
    const proc = spawn(
      'support-bundle',
      ['--interactive=false', '--load-cluster-specs', '-o', '/tmp/bundle.tar.gz'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let output = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.on('error', (err) => {
      resolve({ success: false, output: `${output}\nfailed to spawn support-bundle: ${err.message}` });
    });
    proc.on('close', (code) => {
      resolve({ success: code === 0, output });
    });
  });
}
