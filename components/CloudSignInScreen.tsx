import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { GoogleSignInButton } from './GoogleSignInButton';
import { colors } from '../constants/theme';
import { useCloudSync } from '../hooks/useCloudSync';
import { useI18n } from '../i18n';
import {
  getSupabaseOAuthCallbackUrl,
  getSupabaseOAuthOrigin,
} from '../constants/cloudConfig';

type CloudSignInScreenProps = {
  onBack: () => void;
  onSignedIn: () => void;
};

export function CloudSignInScreen({ onBack, onSignedIn }: CloudSignInScreenProps) {
  const { t } = useI18n();
  const { cloudConfigured, cloudBackendName, session, signInWithGoogle } = useCloudSync();
  const [error, setError] = useState<string | null>(null);

  const oauthSetupHint = useMemo(() => {
    if (Platform.OS !== 'web' || !cloudConfigured) {
      return null;
    }

    const appUrl =
      typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:8081';

    return t('settings.oauthSetupHint', {
      callbackUrl: getSupabaseOAuthCallbackUrl(),
      origin: getSupabaseOAuthOrigin(),
      appUrl,
    });
  }, [cloudConfigured, t]);

  useEffect(() => {
    if (session) {
      onSignedIn();
    }
  }, [onSignedIn, session]);

  const handleGoogleIdToken = async (idToken: string, nonce?: string) => {
    setError(null);
    try {
      await signInWithGoogle(idToken, nonce);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.signInFailed'));
    }
  };

  const handleOAuthComplete = async () => {
    setError(null);
    onSignedIn();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('settings.chooseSignIn')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.hint}>{t('settings.chooseSignInHint')}</Text>
          <Text style={styles.clusterLabel}>
            {t('settings.backendLabel', { backend: cloudBackendName })}
          </Text>

          {!cloudConfigured ? (
            <Text style={styles.warningText}>{t('settings.cloudNotConfigured')}</Text>
          ) : null}

          {oauthSetupHint ? <Text style={styles.setupHint}>{oauthSetupHint}</Text> : null}

          {cloudConfigured ? (
            <GoogleSignInButton
              disabled={!cloudConfigured}
              onIdToken={handleGoogleIdToken}
              onOAuthComplete={handleOAuthComplete}
              onError={setError}
            />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  hint: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
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
  setupHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: colors.continued,
    lineHeight: 18,
  },
});
