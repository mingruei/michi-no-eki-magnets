import { useMemo } from 'react';

import { resolveCastleContent } from '../i18n/castleContent';
import { useI18n } from '../i18n';
import type { Castle } from '../types/castle';

export function useCastleContent(castle: Castle) {
  const { locale, t, getPrefectureLabel } = useI18n();

  return useMemo(
    () => resolveCastleContent(castle, locale, t, getPrefectureLabel),
    [castle, getPrefectureLabel, locale, t],
  );
}
