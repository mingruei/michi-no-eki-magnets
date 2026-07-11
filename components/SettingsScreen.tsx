import { lazy, Suspense, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const CloudSignInScreen = lazy(() =>
  import('./CloudSignInScreen').then((module) => ({ default: module.CloudSignInScreen })),
);
import { colors } from '../constants/theme';
import { useCloudSync } from '../hooks/useCloudSync';
import { useMapProvider } from '../hooks/useMapProvider';
import { useI18n } from '../i18n';
import { isCloudConfigured } from '../constants/cloudConfig';
import type { MapProvider } from '../types/mapProvider';

type SettingsScreenProps = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { t } = useI18n();
  const {
    cloudSyncEnabled,
    session,
    syncing,
    syncError,
    cloudConfigured,
    cloudBackendName,
    setCloudSyncEnabled,
    signOut,
  } = useCloudSync();
  const { mapProvider, setMapProvider } = useMapProvider();
  const [showSignIn, setShowSignIn] = useState(false);

  const mapProviderOptions: { id: MapProvider; labelKey: 'settings.mapProviderApple' | 'settings.mapProviderGoogle' }[] = [
    { id: 'apple', labelKey: 'settings.mapProviderApple' },
    { id: 'google', labelKey: 'settings.mapProviderGoogle' },
  ];

  const canOfferSignIn = cloudConfigured;

  const handleToggleCloud = async (enabled: boolean) => {
    await setCloudSyncEnabled(enabled);
    if (enabled && !session && canOfferSignIn) {
      setShowSignIn(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (showSignIn) {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingFallback}>
            <ActivityIndicator size="large" color={colors.original} />
          </View>
        }
      >
        <CloudSignInScreen
          onBack={() => setShowSignIn(false)}
          onSignedIn={() => setShowSignIn(false)}
        />
      </Suspense>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('settings.cloudSync')}</Text>
              <Text style={styles.rowHint}>{t('settings.cloudSyncHint')}</Text>
            </View>
            <Switch
              value={cloudSyncEnabled}
              onValueChange={handleToggleCloud}
              trackColor={{ false: colors.border, true: colors.originalLight }}
              thumbColor={cloudSyncEnabled ? colors.original : colors.surface}
            />
          </View>
        </View>

        {Platform.OS === 'ios' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.mapProvider')}</Text>
            <Text style={styles.rowHint}>{t('settings.mapProviderHint')}</Text>
            <View style={styles.optionGroup}>
              {mapProviderOptions.map((option) => {
                const selected = mapProvider === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => void setMapProvider(option.id)}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                  >
                    <View style={[styles.optionIndicator, selected && styles.optionIndicatorSelected]} />
                    <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {cloudSyncEnabled ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.cloudAccount')}</Text>
            <Text style={styles.clusterLabel}>
              {t('settings.backendLabel', { backend: cloudBackendName })}
            </Text>

            {!cloudConfigured ? (
              <Text style={styles.warningText}>{t('settings.cloudNotConfigured')}</Text>
            ) : null}

            {session ? (
              <View style={styles.signedInBox}>
                <Text style={styles.signedInTitle}>{t('settings.signedIn')}</Text>
                <Text style={styles.signedInMeta}>{t('settings.providerGoogle')}</Text>
                {session.email ? <Text style={styles.signedInMeta}>{session.email}</Text> : null}
                <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>{t('settings.signOut')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={!canOfferSignIn}
                onPress={() => setShowSignIn(true)}
                style={[styles.primaryButton, !canOfferSignIn && styles.buttonDisabled]}
              >
                <Text style={styles.primaryButtonLabel}>{t('settings.openSignIn')}</Text>
              </Pressable>
            )}

            {syncing ? (
              <View style={styles.syncRow}>
                <ActivityIndicator size="small" color={colors.original} />
                <Text style={styles.syncText}>{t('settings.syncing')}</Text>
              </View>
            ) : null}

            {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.original,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rowHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  clusterLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  warningText: {
    fontSize: 13,
    color: colors.continued,
    lineHeight: 18,
  },
  signedInBox: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  signedInTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  signedInMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.original,
    paddingHorizontal: 16,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  secondaryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.originalLight,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.original,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.continued,
    lineHeight: 18,
  },
  optionGroup: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionRowSelected: {
    borderColor: colors.original,
    backgroundColor: colors.originalLight,
  },
  optionIndicator: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionIndicatorSelected: {
    borderColor: colors.original,
    backgroundColor: colors.original,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
