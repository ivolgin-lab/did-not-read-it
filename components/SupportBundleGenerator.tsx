'use client';

import { useEffect, useRef, useState } from 'react';
import { startBundle, fetchBundleStatus } from '@/actions/support';
import type { BundleStatus } from '@/lib/supportBundle';

export default function SupportBundleGenerator() {
  const [status, setStatus] = useState<BundleStatus>({ state: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const next = await fetchBundleStatus();
      setStatus(next);
      if (next.state !== 'running') stopPolling();
    }, 2000);
  }

  // On mount: pick up the current server-side state. If a run is already in
  // flight (e.g. user navigated away and came back), resume polling.
  useEffect(() => {
    fetchBundleStatus().then((s) => {
      setStatus(s);
      if (s.state === 'running') startPolling();
    });
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    const result = await startBundle();
    setStatus(result.status);
    if (result.status.state === 'running') startPolling();
  }

  const isRunning = status.state === 'running';

  return (
    <div>
      <button className="btn" onClick={handleGenerate} disabled={isRunning}>
        {isRunning ? 'Generating...' : 'Generate Support Bundle'}
      </button>

      {status.state === 'running' && (
        <div className="bundle-status">
          Collecting support bundle... This may take a minute.
        </div>
      )}

      {status.state === 'succeeded' && (
        <div className="bundle-status bundle-success">
          Support bundle generated and uploaded to the Vendor Portal.
          <details>
            <summary>Output</summary>
            <pre className="bundle-logs">{status.output}</pre>
          </details>
        </div>
      )}

      {status.state === 'failed' && (
        <div className="bundle-status bundle-error">
          Support bundle generation failed.
          <details>
            <summary>Output</summary>
            <pre className="bundle-logs">{status.output}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
