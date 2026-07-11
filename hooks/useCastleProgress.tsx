import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { AppState } from 'react-native';

import {
  EMPTY_CASTLE_PROGRESS_ENTRY,
  withFieldUpdate,
  type CastleProgressEntry,
  type CastleProgressField,
  type CastleProgressMap,
} from '../types/castleProgress';
import { loadProgressMap, saveProgressMap } from '../utils/castleProgressStorage';
import { mergeProgressMaps } from '../utils/mergeProgressMap';
import { useCloudSync } from './useCloudSync';

type CastleProgressContextValue = {
  loaded: boolean;
  progressMap: CastleProgressMap;
  getProgress: (castleId: number) => CastleProgressEntry;
  toggleProgress: (castleId: number, field: CastleProgressField) => void;
  markProgressCollected: (castleId: number, field: CastleProgressField) => void;
};

const CastleProgressContext = createContext<CastleProgressContextValue | null>(null);

function applyMergedProgress(
  merged: CastleProgressMap,
  revisionAtSyncStart: number,
  localRevisionRef: MutableRefObject<number>,
  setProgressMap: Dispatch<SetStateAction<CastleProgressMap>>,
): void {
  void saveProgressMap(merged).catch(() => undefined);

  if (revisionAtSyncStart === localRevisionRef.current) {
    setProgressMap(merged);
    return;
  }

  setProgressMap((current) => mergeProgressMaps(merged, current));
}

export function CastleProgressProvider({ children }: { children: ReactNode }) {
  const {
    loaded: cloudLoaded,
    cloudSyncEnabled,
    session,
    syncProgressWithCloud,
    pullAndMergeProgress,
  } = useCloudSync();
  const [loaded, setLoaded] = useState(false);
  const [progressMap, setProgressMap] = useState<CastleProgressMap>({});
  const localRevisionRef = useRef(0);

  useEffect(() => {
    let active = true;

    loadProgressMap()
      .then((map) => {
        if (active) {
          setProgressMap(map);
        }
      })
      .catch(() => {
        if (active) {
          setProgressMap({});
        }
      })
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const runCloudPull = useCallback(() => {
    const revisionAtPullStart = localRevisionRef.current;

    void pullAndMergeProgress().then((merged) => {
      if (!merged) {
        return;
      }

      applyMergedProgress(merged, revisionAtPullStart, localRevisionRef, setProgressMap);
    });
  }, [pullAndMergeProgress]);

  useEffect(() => {
    if (!loaded || !cloudLoaded || !cloudSyncEnabled || !session?.userId) {
      return;
    }

    runCloudPull();
  }, [cloudLoaded, cloudSyncEnabled, loaded, runCloudPull, session?.userId]);

  useEffect(() => {
    if (!loaded || !cloudLoaded || !cloudSyncEnabled || !session?.userId) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runCloudPull();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [cloudLoaded, cloudSyncEnabled, loaded, runCloudPull, session?.userId]);

  const persist = useCallback(
    (nextMap: CastleProgressMap) => {
      const revisionAtSyncStart = localRevisionRef.current;
      void saveProgressMap(nextMap).catch(() => undefined);

      void syncProgressWithCloud(nextMap).then((merged) => {
        if (!merged) {
          return;
        }

        applyMergedProgress(merged, revisionAtSyncStart, localRevisionRef, setProgressMap);
      });
    },
    [syncProgressWithCloud],
  );

  const getProgress = useCallback(
    (castleId: number) => progressMap[castleId] ?? EMPTY_CASTLE_PROGRESS_ENTRY,
    [progressMap],
  );

  const toggleProgress = useCallback(
    (castleId: number, field: CastleProgressField) => {
      localRevisionRef.current += 1;
      setProgressMap((current) => {
        const previous = current[castleId] ?? EMPTY_CASTLE_PROGRESS_ENTRY;
        const next = {
          ...current,
          [castleId]: withFieldUpdate(previous, field, !previous[field]),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markProgressCollected = useCallback(
    (castleId: number, field: CastleProgressField) => {
      const previous = progressMap[castleId] ?? EMPTY_CASTLE_PROGRESS_ENTRY;
      if (previous[field]) {
        return;
      }

      localRevisionRef.current += 1;
      setProgressMap((current) => {
        const entry = current[castleId] ?? EMPTY_CASTLE_PROGRESS_ENTRY;
        const next = {
          ...current,
          [castleId]: withFieldUpdate(entry, field, true),
        };
        persist(next);
        return next;
      });
    },
    [persist, progressMap],
  );

  const value = useMemo(
    () => ({
      loaded,
      progressMap,
      getProgress,
      toggleProgress,
      markProgressCollected,
    }),
    [getProgress, loaded, markProgressCollected, progressMap, toggleProgress],
  );

  return (
    <CastleProgressContext.Provider value={value}>{children}</CastleProgressContext.Provider>
  );
}

export function useCastleProgress() {
  const context = useContext(CastleProgressContext);
  if (!context) {
    throw new Error('useCastleProgress must be used within CastleProgressProvider');
  }
  return context;
}
