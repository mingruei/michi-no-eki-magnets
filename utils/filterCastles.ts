import type { RegionId } from '../constants/regions';
import { getRegionIdForPrefecture } from '../constants/regions';
import type { Castle, SeriesFilter } from '../types/castle';

export type CastleFilters = {
  regionId: RegionId | null;
  prefecture: string | null;
  series: SeriesFilter;
  nameQuery: string;
};

export function filterCastles(
  castles: readonly Castle[],
  filters: CastleFilters,
): Castle[] {
  return castles.filter((castle) => {
    if (filters.series !== 'all' && castle.series !== filters.series) {
      return false;
    }

    const query = filters.nameQuery.trim();
    if (query && !castle.name.includes(query)) {
      return false;
    }

    const castleRegionId = getRegionIdForPrefecture(castle.prefecture);

    if (filters.regionId && castleRegionId !== filters.regionId) {
      return false;
    }

    if (filters.prefecture && castle.prefecture !== filters.prefecture) {
      return false;
    }

    return true;
  });
}

export function getAvailablePrefectures(
  castles: readonly Castle[],
  regionId: RegionId | null,
  series: SeriesFilter = 'all',
): string[] {
  const prefectures = new Set<string>();

  for (const castle of castles) {
    if (series !== 'all' && castle.series !== series) {
      continue;
    }

    if (regionId) {
      const castleRegionId = getRegionIdForPrefecture(castle.prefecture);
      if (castleRegionId !== regionId) {
        continue;
      }
    }
    prefectures.add(castle.prefecture);
  }

  return [...prefectures].sort((left, right) => left.localeCompare(right, 'ja'));
}
