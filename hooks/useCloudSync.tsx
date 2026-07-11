import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cloudConfig, isCloudConfigured } from '../constants/cloudConfig';
import type { CastleProgressMap } from '../types/castleProgress';
import {
  loadCloudSession,
  loadCloudSyncEnabled,
  saveCloudSession,
  saveCloudSyncEnabled,
  type CloudSession,
} from '../utils/cloudSettingsStorage';
import { loadProgressMap, saveProgressMap } from '../utils/castleProgressStorage';
import { mergeProgressMaps } from '../utils/mergeProgressMap';
import { fetchSupabaseProgress, saveSupabaseProgress } from '../utils/supabaseProgressStorage';
import {
  getCurrentCloudSession,
  getSignedInSupabaseUser,
  getSupabaseClient,
  signInWithGoogleIdToken,
  signOutFromSupabase,
} from '../utils/supabaseClient';

type CloudSyncContextValue = {
  loaded: boolean;
  cloudSyncEnabled: boolean;
  session: CloudSession | null;
  syncing: boolean;
  syncError: string | null;
  cloudConfigured: boolean;
  cloudBackendName: string;
  setCloudSyncEnabled: (enabled: boolean) => Promise<void>;
  signInWithGoogle: (idToken: string, nonce?: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncProgressWithCloud: (progressMap: CastleProgressMap) => Promise<CastleProgressMap | null>;
  pullAndMergeProgress: () => Promise<CastleProgressMap | null>;
};

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabledState] = useState(false);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUploadRef = useRef<CastleProgressMap | null>(null);
  const pendingUploadResolversRef = useRef<
    Array<(merged: CastleProgressMap | null) => void>
  >([]);

  const persistSession = useCallback(async (nextSession: CloudSession | null) => {
    setSession(nextSession);
    await saveCloudSession(nextSession);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([loadCloudSyncEnabled(), loadCloudSession(), getCurrentCloudSession()])
      .then(([enabled, storedSession, supabaseSession]) => {
        if (!active) {
          return;
        }
        setCloudSyncEnabledState(enabled);
        setSession(supabaseSession ?? (storedSession?.provider === 'google' ? storedSession : null));
      })
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });

    const supabase = getSupabaseClient();
    const subscription = supabase?.auth.onAuthStateChange((_event, authSession) => {
      if (!active) {
        return;
      }

      if (authSession?.user) {
        void persistSession({
          provider: 'google',
          userId: authSession.user.id,
          email: authSession.user.email ?? null,
        });
        return;
      }

      void persistSession(null);
    });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
      if (uploadTimerRef.current) {
        clearTimeout(uploadTimerRef.current);
      }
    };
  }, [persistSession]);

  const setCloudSyncEnabled = useCallback(async (enabled: boolean) => {
    setCloudSyncEnabledState(enabled);
    await saveCloudSyncEnabled(enabled);
    if (!enabled) {
      setSyncError(null);
    }
  }, []);

  const signInWithGoogle = useCallback(
    async (idToken: string, nonce?: string) => {
      const nextSession = await signInWithGoogleIdToken(idToken, nonce);
      await persistSession(nextSession);
      setSyncError(null);
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
    await persistSession(null);
    setSyncError(null);
  }, [persistSession]);

  const uploadNow = useCallback(async (progressMap: CastleProgressMap): Promise<CastleProgressMap> => {
    const user = await getSignedInSupabaseUser();
    if (!user) {
      return progressMap;
    }

    setSyncing(true);
    try {
      const merged = await saveSupabaseProgress(user, progressMap);
      await saveProgressMap(merged);
      setSyncError(null);
      return merged;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud sync failed';
      setSyncError(message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const pullAndMergeProgress = useCallback(async (): Promise<CastleProgressMap | null> => {
    const user = await getSignedInSupabaseUser();
    if (!cloudSyncEnabled || !user) {
      return null;
    }

    setSyncing(true);
    try {
      const [localMap, cloudSnapshot] = await Promise.all([
        loadProgressMap(),
        fetchSupabaseProgress(user),
      ]);
      const merged = mergeProgressMaps(cloudSnapshot.progressMap, localMap);
      await saveProgressMap(merged);
      await saveSupabaseProgress(user, merged);
      setSyncError(null);
      return merged;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud sync failed';
      setSyncError(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [cloudSyncEnabled]);

  const syncProgressWithCloud = useCallback(
    async (progressMap: CastleProgressMap): Promise<CastleProgressMap | null> => {
      if (!cloudSyncEnabled || !isCloudConfigured()) {
        return null;
      }

      const user = await getSignedInSupabaseUser();
      if (!user) {
        return null;
      }

      return new Promise((resolve) => {
        pendingUploadRef.current = progressMap;
        pendingUploadResolversRef.current.push(resolve);

        if (uploadTimerRef.current) {
          clearTimeout(uploadTimerRef.current);
        }

        uploadTimerRef.current = setTimeout(async () => {
          const pending = pendingUploadRef.current;
          const resolvers = pendingUploadResolversRef.current;
          pendingUploadRef.current = null;
          pendingUploadResolversRef.current = [];
          uploadTimerRef.current = null;

          if (!pending || resolvers.length === 0) {
            resolvers.forEach((resolvePending) => resolvePending(null));
            return;
          }

          try {
            const merged = await uploadNow(pending);
            resolvers.forEach((resolvePending) => resolvePending(merged));
          } catch {
            resolvers.forEach((resolvePending) => resolvePending(null));
          }
        }, 800);
      });
    },
    [cloudSyncEnabled, uploadNow],
  );

  const value = useMemo(
    () => ({
      loaded,
      cloudSyncEnabled,
      session,
      syncing,
      syncError,
      cloudConfigured: isCloudConfigured(),
      cloudBackendName: cloudConfig.cloudBackendName,
      setCloudSyncEnabled,
      signInWithGoogle,
      signOut,
      syncProgressWithCloud,
      pullAndMergeProgress,
    }),
    [
      cloudSyncEnabled,
      loaded,
      pullAndMergeProgress,
      session,
      signInWithGoogle,
      signOut,
      syncError,
      syncProgressWithCloud,
      syncing,
      setCloudSyncEnabled,
    ],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error('useCloudSync must be used within CloudSyncProvider');
  }
  return context;
}
