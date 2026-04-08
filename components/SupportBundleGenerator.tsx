'use client';

import { useState, useEffect, useRef } from 'react';
import { generateSupportBundle, checkBundleStatus } from '@/actions/support';

type State =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'running'; jobName: string }
  | { status: 'succeeded'; logs: string }
  | { status: 'failed'; message: string; logs?: string }
  | { status: 'error'; message: string };

export default function SupportBundleGenerator() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleGenerate() {
    setState({ status: 'creating' });

    const result = await generateSupportBundle();
    if ('error' in result) {
      setState({ status: 'error', message: result.error });
      return;
    }

    setState({ status: 'running', jobName: result.jobName });

    pollRef.current = setInterval(async () => {
      const status = await checkBundleStatus(result.jobName);
      if (status.phase === 'succeeded') {
        if (pollRef.current) clearInterval(pollRef.current);
        setState({ status: 'succeeded', logs: status.logs || '' });
      } else if (status.phase === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        setState({ status: 'failed', message: status.message || 'Job failed', logs: status.logs });
      }
    }, 3000);
  }

  const isGenerating = state.status === 'creating' || state.status === 'running';

  return (
    <div>
      <button className="btn" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Support Bundle'}
      </button>

      {state.status === 'creating' && (
        <div className="bundle-status">Creating support bundle job...</div>
      )}

      {state.status === 'running' && (
        <div className="bundle-status">
          Collecting support bundle data... This may take a minute.
          <div className="bundle-job-name">Job: {state.jobName}</div>
        </div>
      )}

      {state.status === 'succeeded' && (
        <div className="bundle-status bundle-success">
          Support bundle generated and uploaded to the Vendor Portal.
          {state.logs && (
            <details>
              <summary>Job output</summary>
              <pre className="bundle-logs">{state.logs}</pre>
            </details>
          )}
        </div>
      )}

      {state.status === 'failed' && (
        <div className="bundle-status bundle-error">
          Support bundle generation failed: {state.message}
          {state.logs && (
            <details>
              <summary>Job output</summary>
              <pre className="bundle-logs">{state.logs}</pre>
            </details>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <div className="bundle-status bundle-error">
          Error: {state.message}
        </div>
      )}
    </div>
  );
}
