import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { REGIONS, type RegionId } from '../constants/regions';
import { colors } from '../constants/theme';
import { useI18n } from '../i18n';
import type { SeriesFilter } from '../types/castle';

type Option = {
  value: string | null;
  label: string;
};

type LocationFiltersProps = {
  regionId: RegionId | null;
  prefecture: string | null;
  series: SeriesFilter;
  prefectureOptions: readonly Option[];
  onRegionChange: (regionId: RegionId | null) => void;
  onPrefectureChange: (prefecture: string | null) => void;
  onSeriesChange: (series: SeriesFilter) => void;
};

type ActivePicker = 'region' | 'prefecture' | 'series' | null;

function FilterField({
  label,
  value,
  onPress,
  disabled = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.fieldButton, disabled && styles.fieldButtonDisabled]}
      >
        <Text style={[styles.fieldValue, disabled && styles.fieldValueDisabled]}>{value}</Text>
        <Text style={styles.fieldChevron}>▼</Text>
      </Pressable>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly Option[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.modalClose}>{t('common.close')}</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function LocationFilters({
  regionId,
  prefecture,
  series,
  prefectureOptions,
  onRegionChange,
  onPrefectureChange,
  onSeriesChange,
}: LocationFiltersProps) {
  const { t, getRegionLabel, getSeriesLabel } = useI18n();
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const regionOptions = useMemo<readonly Option[]>(
    () => [
      { value: null, label: t('common.all') },
      ...REGIONS.map((region) => ({
        value: region.id,
        label: getRegionLabel(region.id),
      })),
    ],
    [getRegionLabel, t],
  );

  const seriesOptions = useMemo<readonly Option[]>(
    () => [
      { value: 'all', label: t('common.all') },
      { value: 'original', label: getSeriesLabel('original', true) },
      { value: 'continued', label: getSeriesLabel('continued', true) },
    ],
    [getSeriesLabel, t],
  );

  const regionLabel =
    regionOptions.find((option) => option.value === regionId)?.label ?? t('common.all');
  const prefectureLabel =
    prefectureOptions.find((option) => option.value === prefecture)?.label ?? t('common.all');
  const seriesLabel =
    seriesOptions.find((option) => option.value === series)?.label ?? t('common.all');

  return (
    <View style={styles.container}>
      <FilterField
        label={t('filter.series')}
        value={seriesLabel}
        onPress={() => setActivePicker('series')}
      />
      <FilterField
        label={t('filter.region')}
        value={regionLabel}
        onPress={() => setActivePicker('region')}
      />
      <FilterField
        label={t('filter.prefecture')}
        value={prefectureLabel}
        disabled={!regionId}
        onPress={() => setActivePicker('prefecture')}
      />

      <PickerModal
        visible={activePicker === 'series'}
        title={t('filter.selectSeries')}
        options={seriesOptions}
        selectedValue={series}
        onSelect={(value) => onSeriesChange((value ?? 'all') as SeriesFilter)}
        onClose={() => setActivePicker(null)}
      />

      <PickerModal
        visible={activePicker === 'region'}
        title={t('filter.selectRegion')}
        options={regionOptions}
        selectedValue={regionId}
        onSelect={(value) => onRegionChange(value as RegionId | null)}
        onClose={() => setActivePicker(null)}
      />

      <PickerModal
        visible={activePicker === 'prefecture'}
        title={t('filter.selectPrefecture')}
        options={prefectureOptions}
        selectedValue={prefecture}
        onSelect={onPrefectureChange}
        onClose={() => setActivePicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  fieldButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  fieldButtonDisabled: {
    opacity: 0.55,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  fieldValueDisabled: {
    color: colors.textMuted,
  },
  fieldChevron: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.original,
  },
  modalList: {
    paddingBottom: 24,
  },
  modalOption: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOptionSelected: {
    backgroundColor: colors.originalLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: colors.original,
  },
});
