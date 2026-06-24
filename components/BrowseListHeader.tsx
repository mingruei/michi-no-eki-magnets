import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { useI18n } from '../i18n';
import type { RegionId } from '../constants/regions';
import type { SeriesFilter } from '../types/castle';
import { LocationFilters } from './LocationFilters';
import { ProgressStats } from './ProgressStats';

type Option = {
  value: string | null;
  label: string;
};

type BrowseListHeaderProps = {
  series: SeriesFilter;
  regionId: RegionId | null;
  prefecture: string | null;
  prefectureOptions: readonly Option[];
  resultCount: number;
  onSeriesChange: (series: SeriesFilter) => void;
  onRegionChange: (regionId: RegionId | null) => void;
  onPrefectureChange: (prefecture: string | null) => void;
};

export function BrowseListHeader({
  series,
  regionId,
  prefecture,
  prefectureOptions,
  resultCount,
  onSeriesChange,
  onRegionChange,
  onPrefectureChange,
}: BrowseListHeaderProps) {
  const { t, formatCount } = useI18n();

  return (
    <View style={styles.frame}>
      <ProgressStats />
      <View style={styles.divider} />
      <LocationFilters
        series={series}
        regionId={regionId}
        prefecture={prefecture}
        prefectureOptions={prefectureOptions}
        onSeriesChange={onSeriesChange}
        onRegionChange={onRegionChange}
        onPrefectureChange={onPrefectureChange}
      />
      <View style={styles.divider} />
      <View style={styles.resultBar}>
        <Text style={styles.resultCount}>{formatCount(resultCount)}</Text>
        <Text style={styles.resultHint}>{t('filter.resultHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginHorizontal: -16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultCount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  resultHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
