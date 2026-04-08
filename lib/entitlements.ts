const SDK_URL = process.env.REPLICATED_SDK_URL || 'http://didnotreadit-sdk:3000';

export async function isFeatureEnabled(fieldName: string): Promise<boolean> {
  try {
    const res = await fetch(`${SDK_URL}/api/v1/license/fields/${fieldName}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return true; // default to enabled if SDK unavailable
    const data = await res.json();
    return data.value === true || data.value === 'true';
  } catch {
    return true; // default to enabled if SDK unavailable
  }
}

export async function isSearchEnabled(): Promise<boolean> {
  return isFeatureEnabled('search_enabled');
}
