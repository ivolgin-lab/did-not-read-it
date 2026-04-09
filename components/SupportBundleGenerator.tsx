'use client';

import { useState } from 'react';
import { generateSupportBundle } from '@/actions/support';

type State =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'succeeded'; output: string }
  | { status: 'failed'; output: string };

export default function SupportBundleGenerator() {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function handleGenerate() {
    setState({ status: 'running' });
    const result = await generateSupportBundle();
    setState({
      status: result.success ? 'succeeded' : 'failed',
      output: result.output,
    });
  }

  const isRunning = state.status === 'running';

  return (
    <div>
      <button className="btn" onClick={handleGenerate} disabled={isRunning}>
        {isRunning ? 'Generating...' : 'Generate Support Bundle'}
      </button>

      {state.status === 'running' && (
        <div className="bundle-status">Collecting support bundle... This may take a minute.</div>
      )}

      {state.status === 'succeeded' && (
        <div className="bundle-status bundle-success">
          Support bundle generated and uploaded to the Vendor Portal.
          <details>
            <summary>Output</summary>
            <pre className="bundle-logs">{state.output}</pre>
          </details>
        </div>
      )}

      {state.status === 'failed' && (
        <div className="bundle-status bundle-error">
          Support bundle generation failed.
          <details>
            <summary>Output</summary>
            <pre className="bundle-logs">{state.output}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
