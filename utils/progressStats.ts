import type { Castle } from '../types/castle';
import {
  EMPTY_CASTLE_PROGRESS,
  type CastleProgressField,
  type CastleProgressMap,
} from '../types/castleProgress';

export type ProgressCounts = {
  visited: number;
  meijoStamp: number;
  goshuin: number;
  total: number;
};

export type ProgressStats = {
  original: ProgressCounts;
  continued: ProgressCounts;
  total: ProgressCounts;
};

const PROGRESS_FIELDS: CastleProgressField[] = ['visited', 'meijoStamp', 'goshuin'];

function createCounts(total: number): ProgressCounts {
  return {
    visited: 0,
    meijoStamp: 0,
    goshuin: 0,
    total,
  };
}

function addProgress(counts: ProgressCounts, progress: typeof EMPTY_CASTLE_PROGRESS) {
  for (const field of PROGRESS_FIELDS) {
    if (progress[field]) {
      counts[field] += 1;
    }
  }
}

export function computeProgressStats(
  castles: readonly Castle[],
  progressMap: CastleProgressMap,
): ProgressStats {
  const original = createCounts(0);
  const continued = createCounts(0);

  for (const castle of castles) {
    const progress = progressMap[castle.id] ?? EMPTY_CASTLE_PROGRESS;
    if (castle.series === 'original') {
      original.total += 1;
      addProgress(original, progress);
    } else {
      continued.total += 1;
      addProgress(continued, progress);
    }
  }

  return {
    original,
    continued,
    total: {
      visited: original.visited + continued.visited,
      meijoStamp: original.meijoStamp + continued.meijoStamp,
      goshuin: original.goshuin + continued.goshuin,
      total: original.total + continued.total,
    },
  };
}
