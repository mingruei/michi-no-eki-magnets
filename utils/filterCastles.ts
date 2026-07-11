import { normalizePrefectureKey } from '../constants/prefectureKeys';
import type { RegionId } from '../constants/regions';
import { getRegionIdForPrefecture } from '../constants/regions';
import { matchesCastleContentSubtitle } from '../i18n/castleContent';
import type { Castle, SeriesFilter } from '../types/castle';

export type CastleFilters = {
  regionId: RegionId | null;
  prefecture: string | null;
  series: SeriesFilter;
  nameQuery: string;
};

function normalizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[\uFF10-\uFF19]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xff10 + 0x30),
    )
    .replace(/^[#＃]?\s*(?:No\.?|NO\.?|第)?\s*/i, '')
    .replace(/\s*(?:號|号)\s*$/u, '');
}

function parseExactNumberQuery(query: string): number | null {
  if (!/^\d+$/.test(query)) {
    return null;
  }

  const value = Number(query);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function matchesLocationFilters(castle: Castle, filters: CastleFilters): boolean {
  if (filters.series !== 'all' && castle.series !== filters.series) {
    return false;
  }

  const castleRegionId = getRegionIdForPrefecture(castle.prefecture);

  if (filters.regionId && castleRegionId !== filters.regionId) {
    return false;
  }

  if (
    filters.prefecture &&
    normalizePrefectureKey(castle.prefecture) !== normalizePrefectureKey(filters.prefecture)
  ) {
    return false;
  }

  return true;
}

function matchesTextQuery(castle: Castle, query: string): boolean {
  if (castle.name.includes(query)) {
    return true;
  }

  if (castle.nameEn?.includes(query)) {
    return true;
  }

  if (matchesCastleContentSubtitle(castle.id, query)) {
    return true;
  }

  return false;
}

function matchesExactNumberQuery(castle: Castle, numberQuery: number): boolean {
  return castle.number === numberQuery || castle.id === numberQuery;
}

export function filterCastles(
  castles: readonly Castle[],
  filters: CastleFilters,
): Castle[] {
  const query = normalizeSearchQuery(filters.nameQuery);

  if (!query) {
    return castles.filter((castle) => matchesLocationFilters(castle, filters));
  }

  const numberQuery = parseExactNumberQuery(query);
  if (numberQuery != null) {
    return castles.filter((castle) => matchesExactNumberQuery(castle, numberQuery));
  }

  return castles.filter((castle) => matchesTextQuery(castle, query));
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
