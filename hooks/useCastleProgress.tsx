import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  EMPTY_CASTLE_PROGRESS,
  type CastleProgress,
  type CastleProgressField,
  type CastleProgressMap,
} from '../types/castleProgress';

const STORAGE_KEY = 'castle-progress-v1';

type CastleProgressContextValue = {
  loaded: boolean;
  progressMap: CastleProgressMap;
  getProgress: (castleId: number) => CastleProgress;
  toggleProgress: (castleId: number, field: CastleProgressField) => void;
};

const CastleProgressContext = createContext<CastleProgressContextValue | null>(null);

function normalizeProgressMap(raw: unknown): CastleProgressMap {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const map: CastleProgressMap = {};

  for (const [key, value] of Object.entries(raw)) {
    const castleId = Number(key);
    if (!Number.isFinite(castleId) || !value || typeof value !== 'object') {
      continue;
    }

    const entry = value as Partial<CastleProgress>;
    map[castleId] = {
      visited: Boolean(entry.visited),
      meijoStamp: Boolean(entry.meijoStamp),
      goshuin: Boolean(entry.goshuin),
    };
  }

  return map;
}

export function CastleProgressProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [progressMap, setProgressMap] = useState<CastleProgressMap>({});

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active) {
          return;
        }
        setProgressMap(normalizeProgressMap(value ? JSON.parse(value) : {}));
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

  const persist = useCallback((nextMap: CastleProgressMap) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap)).catch(() => undefined);
  }, []);

  const getProgress = useCallback(
    (castleId: number) => progressMap[castleId] ?? EMPTY_CASTLE_PROGRESS,
    [progressMap],
  );

  const toggleProgress = useCallback(
    (castleId: number, field: CastleProgressField) => {
      setProgressMap((current) => {
        const previous = current[castleId] ?? EMPTY_CASTLE_PROGRESS;
        const next = {
          ...current,
          [castleId]: {
            ...previous,
            [field]: !previous[field],
          },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      loaded,
      progressMap,
      getProgress,
      toggleProgress,
    }),
    [getProgress, loaded, progressMap, toggleProgress],
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
