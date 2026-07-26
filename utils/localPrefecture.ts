import * as Location from 'expo-location';

import type { RegionId } from '../constants/regions';
import { getRegionIdForPrefecture } from '../constants/regions';
import type { Castle } from '../types/castle';

export const NEARBY_CASTLE_RADIUS_METERS = 50;

/** Prefer the nearest castle's prefecture within this range (border towns like 津和野). */
export const PREFECTURE_FROM_NEAREST_CASTLE_METERS = 50_000;

export type LocalPrefectureFilter = {
  regionId: RegionId;
  prefecture: string;
};

export type LocalStartupContext = {
  filter: LocalPrefectureFilter | null;
  nearbyCastle: Castle | null;
};

type PrefectureCentroid = {
  prefecture: string;
  latitude: number;
  longitude: number;
};

type JapanCoordinates = {
  latitude: number;
  longitude: number;
};

const JAPAN_BOUNDS = {
  minLatitude: 24,
  maxLatitude: 46.5,
  minLongitude: 122,
  maxLongitude: 154,
};

const EARTH_RADIUS_METERS = 6_371_000;

function isInJapan(latitude: number, longitude: number): boolean {
  return (
    latitude >= JAPAN_BOUNDS.minLatitude &&
    latitude <= JAPAN_BOUNDS.maxLatitude &&
    longitude >= JAPAN_BOUNDS.minLongitude &&
    longitude <= JAPAN_BOUNDS.maxLongitude
  );
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLongitude / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildPrefectureCentroids(castles: readonly Castle[]): PrefectureCentroid[] {
  const totals = new Map<string, { latitude: number; longitude: number; count: number }>();

  for (const castle of castles) {
    if (!castle.prefecture) {
      continue;
    }

    const current = totals.get(castle.prefecture) ?? { latitude: 0, longitude: 0, count: 0 };
    totals.set(castle.prefecture, {
      latitude: current.latitude + castle.latitude,
      longitude: current.longitude + castle.longitude,
      count: current.count + 1,
    });
  }

  return [...totals.entries()].map(([prefecture, value]) => ({
    prefecture,
    latitude: value.latitude / value.count,
    longitude: value.longitude / value.count,
  }));
}

function distanceSquared(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const deltaLatitude = latitudeA - latitudeB;
  const deltaLongitude = longitudeA - longitudeB;
  return deltaLatitude * deltaLatitude + deltaLongitude * deltaLongitude;
}

function findNearestPrefecture(
  latitude: number,
  longitude: number,
  centroids: readonly PrefectureCentroid[],
): string | null {
  let nearestPrefecture: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const centroid of centroids) {
    const distance = distanceSquared(
      latitude,
      longitude,
      centroid.latitude,
      centroid.longitude,
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPrefecture = centroid.prefecture;
    }
  }

  return nearestPrefecture;
}

function normalizePrefectureName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith('県') || trimmed.endsWith('府') || trimmed.endsWith('都') || trimmed === '北海道') {
    return trimmed;
  }

  return `${trimmed}県`;
}

async function resolvePrefectureFromReverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = results[0];
    if (!first) {
      return null;
    }

    return (
      normalizePrefectureName(first.region) ??
      normalizePrefectureName(first.subregion) ??
      normalizePrefectureName(first.district)
    );
  } catch {
    return null;
  }
}

async function getCurrentJapanCoordinates(): Promise<JapanCoordinates | null> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    const permission =
      existing.status === 'undetermined'
        ? await Location.requestForegroundPermissionsAsync()
        : existing;

    if (permission.status !== 'granted') {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    if (!isInJapan(latitude, longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

function filterFromPrefecture(prefecture: string | null | undefined): LocalPrefectureFilter | null {
  if (!prefecture) {
    return null;
  }

  const regionId = getRegionIdForPrefecture(prefecture);
  if (!regionId) {
    return null;
  }

  return { regionId, prefecture };
}

async function resolvePrefectureFilter(
  castles: readonly Castle[],
  latitude: number,
  longitude: number,
): Promise<LocalPrefectureFilter | null> {
  if (castles.length === 0) {
    return null;
  }

  // Near a castle (e.g. 津和野 on the Shimane/Yamaguchi border): trust the castle's
  // prefecture. Prefecture centroids are biased toward distant castle clusters and
  // mis-label border towns (Tsuwano → Yamaguchi).
  const nearbyNamedCastle = findNearestCastleWithinRadius(
    castles,
    latitude,
    longitude,
    PREFECTURE_FROM_NEAREST_CASTLE_METERS,
  );
  const fromNearbyCastle = filterFromPrefecture(nearbyNamedCastle?.prefecture);
  if (fromNearbyCastle) {
    return fromNearbyCastle;
  }

  const geocodedPrefecture = await resolvePrefectureFromReverseGeocode(latitude, longitude);
  const fromGeocode = filterFromPrefecture(geocodedPrefecture);
  if (fromGeocode) {
    return fromGeocode;
  }

  const nearestCastle = findNearestCastleWithinRadius(
    castles,
    latitude,
    longitude,
    Number.POSITIVE_INFINITY,
  );
  const fromNearestCastle = filterFromPrefecture(nearestCastle?.prefecture);
  if (fromNearestCastle) {
    return fromNearestCastle;
  }

  const centroids = buildPrefectureCentroids(castles);
  return filterFromPrefecture(findNearestPrefecture(latitude, longitude, centroids));
}

export function findNearestCastleWithinRadius(
  castles: readonly Castle[],
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Castle | null {
  let nearestCastle: Castle | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const castle of castles) {
    const distance = distanceInMeters(latitude, longitude, castle.latitude, castle.longitude);
    if (distance > radiusMeters || distance >= nearestDistance) {
      continue;
    }

    nearestDistance = distance;
    nearestCastle = castle;
  }

  return nearestCastle;
}

export async function resolveLocalStartupContext(
  castles: readonly Castle[],
  radiusMeters = NEARBY_CASTLE_RADIUS_METERS,
): Promise<LocalStartupContext> {
  const coordinates = await getCurrentJapanCoordinates();
  if (!coordinates) {
    return { filter: null, nearbyCastle: null };
  }

  const { latitude, longitude } = coordinates;
  const [filter, nearbyCastle] = await Promise.all([
    resolvePrefectureFilter(castles, latitude, longitude),
    Promise.resolve(findNearestCastleWithinRadius(castles, latitude, longitude, radiusMeters)),
  ]);

  return { filter, nearbyCastle };
}

export async function resolveLocalPrefectureFilter(
  castles: readonly Castle[],
): Promise<LocalPrefectureFilter | null> {
  const context = await resolveLocalStartupContext(castles);
  return context.filter;
}
