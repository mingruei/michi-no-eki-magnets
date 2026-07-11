import castleContentZhHant from '../assets/i18n/castle-content.zh-Hant.json';
import type { Castle } from '../types/castle';
import type { CastleContentFields } from '../types/castleContent';
import type {
  CastleDrivingContent,
  CastlePublicTransitContent,
  NavigationPoint,
} from '../types/navigation';
import {
  getCastleParkingCoordinates,
  getCastleStampCoordinates,
} from '../utils/castleCoordinates';
import type { Locale, TranslationParams } from './types';

type CastleDrivingOverlay = {
  description?: string | null;
  parkingLocations?: NavigationPoint[];
  parkingLocation?: NavigationPoint;
};

type CastlePublicTransitOverlay = {
  description?: string;
  /** Japanese POI name for Google Maps (recommended over destinationLabel). */
  googleDestination?: string;
  destinationLabel?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
};

type CastleContentOverlay = {
  subtitle?: string | null;
  description?: string;
  stampLocation?: string;
  stampLocations?: NavigationPoint[];
  massTransport?: string;
  driving?: CastleDrivingOverlay;
  publicTransit?: CastlePublicTransitOverlay;
};

const castleContentByLocale: Record<Locale, Record<string, CastleContentOverlay>> = {
  'zh-Hant': castleContentZhHant as Record<string, CastleContentOverlay>,
};

function collectCastleContentSubtitles(): Readonly<Record<number, readonly string[]>> {
  const subtitlesByCastleId = new Map<number, Set<string>>();

  for (const localeContent of Object.values(castleContentByLocale)) {
    for (const [castleIdKey, overlay] of Object.entries(localeContent)) {
      const castleId = Number(castleIdKey);
      const subtitle = overlay.subtitle?.trim();

      if (!Number.isFinite(castleId) || !subtitle) {
        continue;
      }

      const subtitles = subtitlesByCastleId.get(castleId) ?? new Set<string>();
      subtitles.add(subtitle);
      subtitlesByCastleId.set(castleId, subtitles);
    }
  }

  return Object.fromEntries(
    [...subtitlesByCastleId.entries()].map(([castleId, subtitles]) => [castleId, [...subtitles]]),
  );
}

const castleContentSubtitlesByCastleId = collectCastleContentSubtitles();

export function getCastleContentSubtitles(castleId: number): readonly string[] {
  return castleContentSubtitlesByCastleId[castleId] ?? [];
}

export function matchesCastleContentSubtitle(castleId: number, query: string): boolean {
  return getCastleContentSubtitles(castleId).some((subtitle) => subtitle.includes(query));
}

type TranslateFn = (key: string, params?: TranslationParams) => string;
type PrefectureLabelFn = (prefecture: string) => string;

function getLocationLabel(castle: Castle, getPrefectureLabel: PrefectureLabelFn): string {
  return `${getPrefectureLabel(castle.prefecture)}${castle.city}`;
}

function hasCoordinates(point: Pick<NavigationPoint, 'latitude' | 'longitude'>): boolean {
  return point.latitude != null && point.longitude != null;
}

function resolveStampLocations(
  castle: Castle,
  overlay: CastleContentOverlay,
  locationLabel: string,
  t: TranslateFn,
): NavigationPoint[] {
  if (overlay.stampLocations?.length) {
    return overlay.stampLocations;
  }

  const stampKey =
    castle.series === 'original'
      ? 'castle.stampLocationValueOriginal'
      : 'castle.stampLocationValueContinued';

  const fallbackLabel =
    overlay.stampLocation ??
    castle.stampLocation ??
    t(stampKey, { location: locationLabel });

  const stampCoordinates = getCastleStampCoordinates(castle);
  if (stampCoordinates) {
    return [
      {
        label: fallbackLabel,
        latitude: stampCoordinates.latitude,
        longitude: stampCoordinates.longitude,
      },
    ];
  }

  return [{ label: fallbackLabel }];
}

function resolveParkingLocations(
  castle: Castle,
  overlay: CastleContentOverlay,
): NavigationPoint[] {
  const overlayParking = [
    ...(overlay.driving?.parkingLocations ?? []),
    ...(overlay.driving?.parkingLocation ? [overlay.driving.parkingLocation] : []),
  ];

  if (overlayParking.length > 0) {
    return overlayParking;
  }

  const parkingCoordinates = getCastleParkingCoordinates(castle);
  if (parkingCoordinates) {
    return [
      {
        label: `${castle.name} 駐車場`,
        latitude: parkingCoordinates.latitude,
        longitude: parkingCoordinates.longitude,
      },
    ];
  }

  return [];
}

function resolveDrivingContent(
  castle: Castle,
  overlay: CastleContentOverlay,
): CastleDrivingContent {
  return {
    description: overlay.driving?.description ?? null,
    parkingLocations: resolveParkingLocations(castle, overlay),
  };
}

function resolvePublicTransitContent(
  castle: Castle,
  overlay: CastleContentOverlay,
  t: TranslateFn,
): CastlePublicTransitContent {
  const description =
    overlay.publicTransit?.description ??
    overlay.massTransport ??
    castle.massTransport ??
    castle.access ??
    t('castle.noMassTransport');

  return {
    description,
    destinationLatitude:
      overlay.publicTransit?.destinationLatitude ?? castle.latitude,
    destinationLongitude:
      overlay.publicTransit?.destinationLongitude ?? castle.longitude,
    destinationLabel:
      overlay.publicTransit?.googleDestination ??
      overlay.publicTransit?.destinationLabel ??
      castle.name,
  };
}

function resolveZhHantContent(
  castle: Castle,
  t: TranslateFn,
  getPrefectureLabel: PrefectureLabelFn,
): CastleContentFields {
  const overlay = castleContentByLocale['zh-Hant'][String(castle.id)] ?? {};
  const locationLabel = getLocationLabel(castle, getPrefectureLabel);

  return {
    locationLabel,
    subtitle: overlay.subtitle ?? null,
    description:
      overlay.description ??
      (castle.series === 'continued'
        ? t('castle.continuedDescription', { location: locationLabel })
        : t('castle.noDescription')),
    stampLocations: resolveStampLocations(castle, overlay, locationLabel, t),
    driving: resolveDrivingContent(castle, overlay),
    publicTransit: resolvePublicTransitContent(castle, overlay, t),
  };
}

function resolveDefaultContent(
  castle: Castle,
  t: TranslateFn,
  getPrefectureLabel: PrefectureLabelFn,
): CastleContentFields {
  const locationLabel = getLocationLabel(castle, getPrefectureLabel);
  const stampLabel =
    castle.stampLocation ?? t('castle.noStampLocation');

  const stampCoordinates = getCastleStampCoordinates(castle);
  const stampLocations: NavigationPoint[] = stampCoordinates
    ? [
        {
          label: stampLabel,
          latitude: stampCoordinates.latitude,
          longitude: stampCoordinates.longitude,
        },
      ]
    : [{ label: stampLabel }];

  const parkingCoordinates = getCastleParkingCoordinates(castle);
  const parkingLocations: NavigationPoint[] = parkingCoordinates
    ? [
        {
          label: `${castle.name} 駐車場`,
          latitude: parkingCoordinates.latitude,
          longitude: parkingCoordinates.longitude,
        },
      ]
    : [];

  return {
    locationLabel,
    subtitle: castle.nameEn ?? null,
    description: castle.shortDescription ?? castle.history ?? t('castle.noDescription'),
    stampLocations,
    driving: {
      description: null,
      parkingLocations,
    },
    publicTransit: {
      description:
        castle.massTransport ?? castle.access ?? t('castle.noMassTransport'),
      destinationLatitude: castle.latitude,
      destinationLongitude: castle.longitude,
      destinationLabel: castle.name,
    },
  };
}

export function resolveCastleContent(
  castle: Castle,
  locale: Locale,
  t: TranslateFn,
  getPrefectureLabel: PrefectureLabelFn,
): CastleContentFields {
  if (locale === 'zh-Hant') {
    return resolveZhHantContent(castle, t, getPrefectureLabel);
  }

  return resolveDefaultContent(castle, t, getPrefectureLabel);
}

export { hasCoordinates };
