import SupportBundleGenerator from '@/components/SupportBundleGenerator';

export default function SupportPage() {
  return (
    <div className="form-page">
      <h1>Support</h1>
      <p className="support-description">
        Generate a support bundle to collect diagnostic information about your installation.
        The bundle includes application logs, cluster state, and health checks.
        It will be uploaded to the Vendor Portal for analysis.
      </p>
      <div className="support-actions">
        <SupportBundleGenerator />
      </div>
    </div>
  );
}
