import AsyncStorage from '@react-native-async-storage/async-storage';

const CLOUD_SYNC_ENABLED_KEY = 'cloud-sync-enabled-v1';
const CLOUD_SESSION_KEY = 'cloud-session-v1';

export type CloudProvider = 'google';

export type CloudSession = {
  provider: CloudProvider;
  userId: string;
  email?: string | null;
};

export async function loadCloudSyncEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(CLOUD_SYNC_ENABLED_KEY);
  return value === 'true';
}

export async function saveCloudSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CLOUD_SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function loadCloudSession(): Promise<CloudSession | null> {
  const raw = await AsyncStorage.getItem(CLOUD_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CloudSession;
    if (!parsed?.userId || parsed.provider !== 'google') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCloudSession(session: CloudSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(CLOUD_SESSION_KEY);
    return;
  }

  await AsyncStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
}
