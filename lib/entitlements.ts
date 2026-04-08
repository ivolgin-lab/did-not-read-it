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
