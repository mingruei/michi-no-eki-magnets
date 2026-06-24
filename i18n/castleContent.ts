import castleContentZhHant from '../assets/i18n/castle-content.zh-Hant.json';
import type { Castle } from '../types/castle';
import type { CastleContentFields } from '../types/castleContent';
import type { Locale, TranslationParams } from './types';

type CastleContentOverlay = Partial<
  Pick<CastleContentFields, 'description' | 'stampLocation' | 'massTransport' | 'subtitle'>
>;

const castleContentByLocale: Record<Locale, Record<string, CastleContentOverlay>> = {
  'zh-Hant': castleContentZhHant as Record<string, CastleContentOverlay>,
};

type TranslateFn = (key: string, params?: TranslationParams) => string;
type PrefectureLabelFn = (prefecture: string) => string;

function getLocationLabel(castle: Castle, getPrefectureLabel: PrefectureLabelFn): string {
  return `${getPrefectureLabel(castle.prefecture)}${castle.city}`;
}

function resolveZhHantContent(
  castle: Castle,
  t: TranslateFn,
  getPrefectureLabel: PrefectureLabelFn,
): CastleContentFields {
  const overlay = castleContentByLocale['zh-Hant'][String(castle.id)] ?? {};
  const locationLabel = getLocationLabel(castle, getPrefectureLabel);
  const stampKey =
    castle.series === 'original'
      ? 'castle.stampLocationValueOriginal'
      : 'castle.stampLocationValueContinued';

  return {
    locationLabel,
    subtitle: overlay.subtitle ?? null,
    description:
      overlay.description ??
      (castle.series === 'continued'
        ? t('castle.continuedDescription', { location: locationLabel })
        : t('castle.noDescription')),
    stampLocation: overlay.stampLocation ?? t(stampKey, { location: locationLabel }),
    massTransport: overlay.massTransport ?? t('castle.noMassTransport'),
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

  const locationLabel = getLocationLabel(castle, getPrefectureLabel);

  return {
    locationLabel,
    subtitle: castle.nameEn ?? null,
    description: castle.shortDescription ?? castle.history ?? t('castle.noDescription'),
    stampLocation: castle.stampLocation ?? t('castle.noStampLocation'),
    massTransport: castle.massTransport ?? castle.access ?? t('castle.noMassTransport'),
  };
}
