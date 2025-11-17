const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface GuidancePreferences {
  guidanceEnabled: boolean;
  autoScrollSpeed: 'slow' | 'normal' | 'fast';
  hasSeenOnboarding: boolean;
}

const STORAGE_KEY = 'shade_guidance_preferences';
const FINGERPRINT_KEY = 'shade_device_fingerprint';

function generateDeviceFingerprint(): string {
  const existingFingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (existingFingerprint) {
    return existingFingerprint;
  }

  const fingerprint = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}

export function getDeviceFingerprint(): string {
  return generateDeviceFingerprint();
}

export function getDefaultPreferences(): GuidancePreferences {
  return {
    guidanceEnabled: true,
    autoScrollSpeed: 'normal',
    hasSeenOnboarding: false,
  };
}

export function getLocalPreferences(): GuidancePreferences | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as GuidancePreferences;
  } catch (error) {
    console.error('Error reading guidance preferences from localStorage:', error);
    return null;
  }
}

export function saveLocalPreferences(preferences: GuidancePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving guidance preferences to localStorage:', error);
  }
}

export async function getSupabasePreferences(deviceFingerprint: string): Promise<GuidancePreferences | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_guidance_preferences?device_fingerprint=eq.${deviceFingerprint}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch guidance preferences from Supabase');
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const record = data[0];
      return {
        guidanceEnabled: record.guidance_enabled,
        autoScrollSpeed: record.auto_scroll_speed,
        hasSeenOnboarding: record.has_seen_onboarding,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching guidance preferences from Supabase:', error);
    return null;
  }
}

export async function saveSupabasePreferences(
  deviceFingerprint: string,
  preferences: GuidancePreferences
): Promise<boolean> {
  try {
    const existingPrefs = await getSupabasePreferences(deviceFingerprint);

    const payload = {
      device_fingerprint: deviceFingerprint,
      guidance_enabled: preferences.guidanceEnabled,
      auto_scroll_speed: preferences.autoScrollSpeed,
      has_seen_onboarding: preferences.hasSeenOnboarding,
      preference_updated_at: new Date().toISOString(),
    };

    if (existingPrefs) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_guidance_preferences?device_fingerprint=eq.${deviceFingerprint}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
        }
      );

      return response.ok;
    } else {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_guidance_preferences`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
        }
      );

      return response.ok;
    }
  } catch (error) {
    console.error('Error saving guidance preferences to Supabase:', error);
    return false;
  }
}

export async function loadPreferences(): Promise<GuidancePreferences> {
  const localPrefs = getLocalPreferences();
  if (localPrefs) {
    return localPrefs;
  }

  const deviceFingerprint = getDeviceFingerprint();
  const supabasePrefs = await getSupabasePreferences(deviceFingerprint);

  if (supabasePrefs) {
    saveLocalPreferences(supabasePrefs);
    return supabasePrefs;
  }

  const defaultPrefs = getDefaultPreferences();
  saveLocalPreferences(defaultPrefs);
  await saveSupabasePreferences(deviceFingerprint, defaultPrefs);

  return defaultPrefs;
}

export async function updatePreferences(updates: Partial<GuidancePreferences>): Promise<void> {
  const currentPrefs = getLocalPreferences() || getDefaultPreferences();
  const newPrefs = { ...currentPrefs, ...updates };

  saveLocalPreferences(newPrefs);

  const deviceFingerprint = getDeviceFingerprint();
  await saveSupabasePreferences(deviceFingerprint, newPrefs);
}

export function resetPreferences(): void {
  localStorage.removeItem(STORAGE_KEY);
  const defaultPrefs = getDefaultPreferences();
  saveLocalPreferences(defaultPrefs);

  const deviceFingerprint = getDeviceFingerprint();
  saveSupabasePreferences(deviceFingerprint, defaultPrefs);
}
