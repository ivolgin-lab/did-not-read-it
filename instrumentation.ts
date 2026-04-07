export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reportMetrics } = await import('./lib/metrics');
    const intervalMs = parseInt(process.env.METRICS_INTERVAL_MS || '300000', 10);

    if (process.env.METRICS_ENABLED !== 'false') {
      reportMetrics();
      setInterval(reportMetrics, intervalMs);
    }
  }
}
