import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type RegionId } from '../constants/regions';
import { colors } from '../constants/theme';
import { useCastleGroups } from '../hooks/useCastleGroups';
import { useCastleProgress } from '../hooks/useCastleProgress';
import { useI18n } from '../i18n';
import type { Castle, ProgressFilter, SeriesFilter } from '../types/castle';
import type { CastleGroup } from '../types/castleGroup';
import { filterCastles, getAvailablePrefectures } from '../utils/filterCastles';
import { LocationFilters } from './LocationFilters';

type GroupsScreenProps = {
  castles: readonly Castle[];
  onBack: () => void;
};

type Mode = 'list' | 'create';

export function GroupsScreen({ castles, onBack }: GroupsScreenProps) {
  const { t, getPrefectureLabel, getSeriesLabel, formatCount } = useI18n();
  const { groups, createGroup } = useCastleGroups();
  const { progressMap } = useCastleProgress();

  const [mode, setMode] = useState<Mode>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');

  const [series, setSeries] = useState<SeriesFilter>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState('');

  const castleById = useMemo(() => {
    const map = new Map<number, Castle>();
    for (const castle of castles) {
      map.set(castle.id, castle);
    }
    return map;
  }, [castles]);

  const selectedCastles = useMemo(
    () =>
      selectedIds
        .map((id) => castleById.get(id))
        .filter((castle): castle is Castle => castle != null),
    [castleById, selectedIds],
  );

  const prefectureOptions = useMemo(() => {
    const prefectures = getAvailablePrefectures(castles, regionId, series);
    return [
      { value: null, label: t('common.all') },
      ...prefectures.map((item) => ({
        value: item,
        label: getPrefectureLabel(item),
      })),
    ];
  }, [castles, getPrefectureLabel, regionId, series, t]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredCastles = useMemo(
    () =>
      filterCastles(castles, {
        regionId,
        prefecture,
        series,
        nameQuery,
        progressFilter,
        progressMap,
      })
        .filter((castle) => !selectedIdSet.has(castle.id))
        .sort((left, right) => left.number - right.number),
    [
      castles,
      nameQuery,
      prefecture,
      progressFilter,
      progressMap,
      regionId,
      selectedIdSet,
      series,
    ],
  );

  const openCreate = () => {
    setSelectedIds([]);
    setGroupName('');
    setSeries('all');
    setProgressFilter('all');
    setRegionId(null);
    setPrefecture(null);
    setNameQuery('');
    setMode('create');
  };

  const handleBack = () => {
    if (mode === 'create') {
      setMode('list');
      return;
    }
    onBack();
  };

  const addCastle = (castleId: number) => {
    setSelectedIds((current) =>
      current.includes(castleId) ? current : [...current, castleId],
    );
  };

  const removeCastle = (castleId: number) => {
    setSelectedIds((current) => current.filter((id) => id !== castleId));
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    await createGroup(groupName, selectedIds, t('group.unnamed'));
    setMode('list');
  };

  const title = mode === 'list' ? t('group.title') : t('group.createTitle');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>

      {mode === 'list' ? (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {groups.length > 0 ? (
                <Text style={styles.sectionTitle}>{t('group.listTitle')}</Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <GroupListRow group={item} castleById={castleById} />
          )}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              onPress={openCreate}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonLabel}>{t('group.add')}</Text>
            </Pressable>
          }
          ListEmptyComponent={null}
        />
      ) : (
        <FlatList
          data={filteredCastles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.createHeader}>
              <View style={styles.joinedSection}>
                <Text style={styles.fieldLabel}>{t('group.nameLabel')}</Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={t('group.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.nameInput}
                />

                {selectedCastles.length > 0 ? (
                  <View style={styles.joinedList}>
                    <Text style={styles.joinedTitle}>
                      {t('group.joinedTitle', { count: selectedCastles.length })}
                    </Text>
                    <Text style={styles.joinedHint}>{t('group.joinedHint')}</Text>
                    {selectedCastles.map((castle) => (
                      <Pressable
                        key={castle.id}
                        accessibilityRole="button"
                        onPress={() => removeCastle(castle.id)}
                        style={styles.castleRow}
                      >
                        <Text style={styles.castleRowLabel}>
                          {castle.number} {castle.name}
                        </Text>
                        <Text style={styles.castleRowAction}>{t('group.remove')}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, styles.filterSectionTitle]}>
                  {t('group.filterTitle')}
                </Text>
                <LocationFilters
                  series={series}
                  progressFilter={progressFilter}
                  regionId={regionId}
                  prefecture={prefecture}
                  nameQuery={nameQuery}
                  prefectureOptions={prefectureOptions}
                  onSeriesChange={(next) => {
                    setSeries(next);
                    setNameQuery('');
                  }}
                  onProgressFilterChange={setProgressFilter}
                  onRegionChange={(next) => {
                    setRegionId(next);
                    setPrefecture(null);
                    setNameQuery('');
                  }}
                  onPrefectureChange={(next) => {
                    setPrefecture(next);
                    setNameQuery('');
                  }}
                  onNameQueryChange={(next) => {
                    setNameQuery(next);
                    if (next.trim()) {
                      setSeries('all');
                      setRegionId(null);
                      setPrefecture(null);
                    }
                  }}
                />
                <View style={styles.resultBar}>
                  <Text style={styles.resultCount}>{formatCount(filteredCastles.length)}</Text>
                  <Text style={styles.resultHint}>{t('filter.resultHint')}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t('group.castleListTitle')}</Text>
              <Text style={styles.joinedHint}>{t('group.addHint')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => addCastle(item.id)}
              style={styles.castleRow}
            >
              <Text style={styles.castleRowLabel}>
                {item.number} {item.name}（{getSeriesLabel(item.series)}）
              </Text>
              <Text style={styles.castleRowActionAdd}>{t('group.addCastle')}</Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              disabled={selectedIds.length === 0}
              onPress={() => void handleSave()}
              style={[
                styles.primaryButton,
                selectedIds.length === 0 && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>{t('group.save')}</Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

function GroupListRow({
  group,
  castleById,
}: {
  group: CastleGroup;
  castleById: Map<number, Castle>;
}) {
  const { t } = useI18n();
  const names = group.castleIds
    .map((id) => castleById.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.groupMeta}>
        {t('group.castleCount', { count: group.castleIds.length })}
      </Text>
      {names.length > 0 ? (
        <Text style={styles.groupPreview} numberOfLines={2}>
          {names.join('、')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.original,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  listHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  filterSectionTitle: {
    paddingHorizontal: 16,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  groupMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  groupPreview: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: colors.original,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  createHeader: {
    gap: 4,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 4,
  },
  joinedSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  joinedList: {
    marginTop: 8,
    gap: 4,
  },
  joinedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  joinedHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  castleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  castleRowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  castleRowAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.continued,
  },
  castleRowActionAdd: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.original,
  },
  filterSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  resultHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
