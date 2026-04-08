const SDK_URL = process.env.REPLICATED_SDK_URL || 'http://didnotreadit-sdk:3000';

export async function isFeatureEnabled(fieldName: string): Promise<boolean> {
  try {
    const res = await fetch(`${SDK_URL}/api/v1/license/fields/${fieldName}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[entitlements] SDK returned ${res.status} for field ${fieldName}`);
      return true;
    }
    const data = await res.json();
    return data.value === true || data.value === 'true';
  } catch (err) {
    console.error(`[entitlements] failed to check field ${fieldName}:`, err);
    return true;
  }
}

export async function isSearchEnabled(): Promise<boolean> {
  return isFeatureEnabled('search_enabled');
}

export async function getAvailableUpdates(): Promise<{ versionLabel: string; createdAt: string; releaseNotes: string }[]> {
  try {
    const res = await fetch(`${SDK_URL}/api/v1/app/updates`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('[entitlements] failed to check for updates:', err);
    return [];
  }
}

export interface LicenseInfo {
  licenseID: string;
  licenseType: string;
  customerName: string;
  channelName: string;
  entitlements: Record<string, { title: string; value: string; valueType: string }>;
}

export async function getLicenseInfo(): Promise<LicenseInfo | null> {
  try {
    const res = await fetch(`${SDK_URL}/api/v1/license/info`, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[entitlements] SDK returned ${res.status} for license info`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[entitlements] failed to get license info:', err);
    return null;
  }
}

export function isLicenseExpired(license: LicenseInfo): boolean {
  const expiresAt = license.entitlements?.expires_at?.value;
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export async function checkLicenseValid(): Promise<boolean> {
  const license = await getLicenseInfo();
  if (!license) return true; // allow if SDK unavailable
  return !isLicenseExpired(license);
}

export async function requireValidLicense(): Promise<void> {
  const valid = await checkLicenseValid();
  if (!valid) {
    throw new Error('LICENSE_EXPIRED');
  }
}
