import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import castlesData from './assets/castles.json';
import { CastleDetailScreen } from './components/CastleDetailScreen';
import { BrowseListHeader } from './components/BrowseListHeader';
import { CastleList } from './components/CastleList';
import { CastleMap } from './components/CastleMap';
import type { RegionId } from './constants/regions';
import { colors } from './constants/theme';
import { CastleProgressProvider } from './hooks/useCastleProgress';
import { I18nProvider, useI18n } from './i18n';
import type { Castle, SeriesFilter } from './types/castle';
import { filterCastles, getAvailablePrefectures } from './utils/filterCastles';

const castles = castlesData as Castle[];

type MainScreen = 'browse' | 'map';
type Screen = MainScreen | 'detail';

function AppContent() {
  const { t, getPrefectureLabel } = useI18n();
  const [screen, setScreen] = useState<Screen>('browse');
  const [returnScreen, setReturnScreen] = useState<MainScreen>('browse');
  const [series, setSeries] = useState<SeriesFilter>('all');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);

  const prefectureOptions = useMemo(() => {
    const prefectures = getAvailablePrefectures(castles, regionId, series);
    return [
      { value: null, label: t('common.all') },
      ...prefectures.map((item) => ({
        value: item,
        label: getPrefectureLabel(item),
      })),
    ];
  }, [getPrefectureLabel, regionId, series, t]);

  const filteredCastles = useMemo(
    () =>
      filterCastles(castles, { regionId, prefecture, series }).sort(
        (left, right) => left.number - right.number,
      ),
    [prefecture, regionId, series],
  );

  const openCastleDetail = (castle: Castle) => {
    setReturnScreen(screen === 'map' ? 'map' : 'browse');
    setSelectedCastle(castle);
    setScreen('detail');
  };

  const handleBackFromDetail = () => {
    setScreen(returnScreen);
    setSelectedCastle(null);
  };

  const closeDetailIfOpen = () => {
    if (screen === 'detail') {
      setScreen(returnScreen);
      setSelectedCastle(null);
    }
  };

  const handleSeriesChange = (nextSeries: SeriesFilter) => {
    setSeries(nextSeries);
    closeDetailIfOpen();
  };

  const handleRegionChange = (nextRegionId: RegionId | null) => {
    setRegionId(nextRegionId);
    setPrefecture(null);
    closeDetailIfOpen();
  };

  const handlePrefectureChange = (nextPrefecture: string | null) => {
    setPrefecture(nextPrefecture);
    closeDetailIfOpen();
  };

  if (screen === 'detail' && selectedCastle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <CastleDetailScreen castle={selectedCastle} onBack={handleBackFromDetail} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('app.title')}</Text>
          <Text style={styles.subtitle}>{t('app.subtitle')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setScreen((current) => (current === 'browse' ? 'map' : 'browse'));
            setSelectedCastle(null);
          }}
          style={styles.screenToggle}
        >
          <Text style={styles.screenToggleLabel}>
            {screen === 'browse' ? t('screen.map') : t('screen.list')}
          </Text>
        </Pressable>
      </View>

      {screen === 'browse' ? (
        <CastleList
          castles={filteredCastles}
          onSelectCastle={openCastleDetail}
          ListHeaderComponent={
            <BrowseListHeader
              series={series}
              regionId={regionId}
              prefecture={prefecture}
              prefectureOptions={prefectureOptions}
              resultCount={filteredCastles.length}
              onSeriesChange={handleSeriesChange}
              onRegionChange={handleRegionChange}
              onPrefectureChange={handlePrefectureChange}
            />
          }
        />
      ) : (
        <CastleMap
          castles={filteredCastles}
          onSelectCastle={openCastleDetail}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <CastleProgressProvider>
        <AppContent />
      </CastleProgressProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  screenToggle: {
    marginLeft: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.originalLight,
  },
  screenToggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.original,
  },
});
