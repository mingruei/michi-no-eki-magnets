import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';

import castlesData from './assets/castles.json';
import { GlobalCollectibleUploadFab } from './components/GlobalCollectibleUploadFab';
import { CastleDetailScreen } from './components/CastleDetailScreen';
import { BrowseListHeader } from './components/BrowseListHeader';
import { CastleList } from './components/CastleList';
import { CastleMap } from './components/CastleMap';
import { SettingsScreen } from './components/SettingsScreen';
import type { RegionId } from './constants/regions';
import { colors } from './constants/theme';
import { CloudSyncProvider } from './hooks/useCloudSync';
import { MapProviderProvider } from './hooks/useMapProvider';
import { CastleProgressProvider } from './hooks/useCastleProgress';
import { useConditionalPortraitLock } from './hooks/useConditionalPortraitLock';
import { I18nProvider, useI18n } from './i18n';
import type { Castle, SeriesFilter } from './types/castle';
import { filterCastles, getAvailablePrefectures } from './utils/filterCastles';
import { resolveLocalStartupContext } from './utils/localPrefecture';

const castles = castlesData as Castle[];

WebBrowser.maybeCompleteAuthSession();

type MainScreen = 'browse' | 'map';
type Screen = MainScreen | 'detail' | 'settings';

function AppContent() {
  const { t, getPrefectureLabel } = useI18n();
  useConditionalPortraitLock();
  const [screen, setScreen] = useState<Screen>('browse');
  const [returnScreen, setReturnScreen] = useState<MainScreen>('browse');
  const [series, setSeries] = useState<SeriesFilter>('all');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);
  const openUploadRef = useRef<(() => void) | null>(null);

  const registerOpenUpload = useCallback((open: () => void) => {
    openUploadRef.current = open;
  }, []);

  useEffect(() => {
    let active = true;

    resolveLocalStartupContext(castles).then((result) => {
      if (!active) {
        return;
      }

      if (result.filter) {
        setRegionId(result.filter.regionId);
        setPrefecture(result.filter.prefecture);
      }

      if (result.nearbyCastle) {
        setReturnScreen('browse');
        setSelectedCastle(result.nearbyCastle);
        setScreen('detail');
      }
    });

    return () => {
      active = false;
    };
  }, []);

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
      filterCastles(castles, { regionId, prefecture, series, nameQuery }).sort(
        (left, right) => left.number - right.number,
      ),
    [nameQuery, prefecture, regionId, series],
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
    setNameQuery('');
    closeDetailIfOpen();
  };

  const handleRegionChange = (nextRegionId: RegionId | null) => {
    setRegionId(nextRegionId);
    setPrefecture(null);
    setNameQuery('');
    closeDetailIfOpen();
  };

  const handlePrefectureChange = (nextPrefecture: string | null) => {
    setPrefecture(nextPrefecture);
    setNameQuery('');
    closeDetailIfOpen();
  };

  const handleNameQueryChange = (nextNameQuery: string) => {
    setNameQuery(nextNameQuery);
    if (nextNameQuery.trim()) {
      setSeries('all');
      setRegionId(null);
      setPrefecture(null);
    }
    closeDetailIfOpen();
  };

  const isDetailOpen = screen === 'detail' && selectedCastle !== null;
  const isSettingsOpen = screen === 'settings';
  const isOverlayOpen = isDetailOpen || isSettingsOpen;
  const activeMainScreen: MainScreen =
    screen === 'browse' || screen === 'map' ? screen : returnScreen;

  const openSettings = () => {
    setReturnScreen(activeMainScreen);
    setScreen('settings');
    setSelectedCastle(null);
  };

  const handleBackFromSettings = () => {
    setScreen(returnScreen);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.mainContent} pointerEvents={isOverlayOpen ? 'none' : 'auto'}>
          {!isOverlayOpen ? (
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.title}>{t('app.title')}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {t('app.subtitle')}
                </Text>
              </View>

              <View style={styles.headerActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openUploadRef.current?.()}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonLabel}>{t('globalUpload.fabLabel')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setScreen((current) => (current === 'browse' ? 'map' : 'browse'));
                    setSelectedCastle(null);
                  }}
                  style={[
                    styles.headerButton,
                    activeMainScreen === 'map' && styles.headerButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.headerButtonLabel,
                      activeMainScreen === 'map' && styles.headerButtonLabelActive,
                    ]}
                  >
                    {t('screen.map')}
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={openSettings} style={styles.headerButton}>
                  <Text style={styles.headerButtonLabel}>{t('screen.settings')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeMainScreen === 'browse' ? (
            <CastleList
              castles={filteredCastles}
              onSelectCastle={openCastleDetail}
              ListHeaderComponent={
                <BrowseListHeader
                  series={series}
                  regionId={regionId}
                  prefecture={prefecture}
                  nameQuery={nameQuery}
                  prefectureOptions={prefectureOptions}
                  resultCount={filteredCastles.length}
                  onSeriesChange={handleSeriesChange}
                  onRegionChange={handleRegionChange}
                  onPrefectureChange={handlePrefectureChange}
                  onNameQueryChange={handleNameQueryChange}
                />
              }
            />
          ) : (
            <CastleMap castles={filteredCastles} onSelectCastle={openCastleDetail} />
          )}
        </View>

        {isDetailOpen ? (
          <SafeAreaView style={styles.detailLayer} edges={['top', 'left', 'right', 'bottom']}>
            <CastleDetailScreen castle={selectedCastle} onBack={handleBackFromDetail} />
          </SafeAreaView>
        ) : null}

        {isSettingsOpen ? (
          <SafeAreaView style={styles.detailLayer} edges={['top', 'left', 'right', 'bottom']}>
            <SettingsScreen onBack={handleBackFromSettings} />
          </SafeAreaView>
        ) : null}
      </View>

      <GlobalCollectibleUploadFab
        castles={castles}
        enabled={!isOverlayOpen}
        onRegisterOpen={registerOpenUpload}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <MapProviderProvider>
          <CloudSyncProvider>
            <CastleProgressProvider>
              <AppContent />
            </CastleProgressProvider>
          </CloudSyncProvider>
        </MapProviderProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  detailLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 0,
  },
  subtitle: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerButtonActive: {
    borderColor: colors.original,
    backgroundColor: colors.originalLight,
  },
  headerButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerButtonLabelActive: {
    color: colors.original,
  },
});
