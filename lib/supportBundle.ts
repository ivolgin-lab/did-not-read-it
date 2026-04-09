import { spawn } from 'child_process';

// In-memory state for the most recent support bundle run. Only one bundle can
// be in flight at a time. The state is lost when the app pod restarts — that's
// acceptable for this use case (operator-triggered ad-hoc bundles).
export type BundleStatus =
  | { state: 'idle' }
  | { state: 'running'; startedAt: number }
  | { state: 'succeeded'; startedAt: number; finishedAt: number; output: string }
  | { state: 'failed'; startedAt: number; finishedAt: number; output: string };

let current: BundleStatus = { state: 'idle' };

export function getStatus(): BundleStatus {
  return current;
}

// Kicks off a new bundle run. If one is already in flight, returns the
// existing status without starting another.
export function startSupportBundle(): { started: boolean; status: BundleStatus } {
  if (current.state === 'running') {
    return { started: false, status: current };
  }

  const startedAt = Date.now();
  current = { state: 'running', startedAt };

  let output = '';
  const proc = spawn(
    'support-bundle',
    ['--interactive=false', '--load-cluster-specs', '-o', '/tmp/bundle.tar.gz'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  proc.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  proc.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  proc.on('error', (err) => {
    current = {
      state: 'failed',
      startedAt,
      finishedAt: Date.now(),
      output: `${output}\nfailed to spawn support-bundle: ${err.message}`,
    };
  });
  proc.on('close', (code) => {
    current = {
      state: code === 0 ? 'succeeded' : 'failed',
      startedAt,
      finishedAt: Date.now(),
      output,
    };
  });

  return { started: true, status: current };
}
