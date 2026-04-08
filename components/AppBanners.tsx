import { getAvailableUpdates, getLicenseInfo, isLicenseExpired } from '@/lib/entitlements';

export default async function AppBanners() {
  const [updates, license] = await Promise.all([getAvailableUpdates(), getLicenseInfo()]);

  const expired = license ? isLicenseExpired(license) : false;
  const latestUpdate = updates.length > 0 ? updates[0] : null;

  if (!expired && !latestUpdate) return null;

  return (
    <div className="app-banners">
      {expired && (
        <div className="banner banner-error">
          Your license has expired. Some features may be unavailable. Please contact your administrator to renew.
        </div>
      )}
      {latestUpdate && (
        <div className="banner banner-info">
          Update available: version {latestUpdate.versionLabel}. Contact your administrator to upgrade.
        </div>
      )}
    </div>
  );
}
