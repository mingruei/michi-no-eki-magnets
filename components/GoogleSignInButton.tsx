import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../constants/theme';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { useI18n } from '../i18n';

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onIdToken: (idToken: string, nonce?: string) => void;
  onOAuthComplete?: () => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({
  disabled = false,
  onIdToken,
  onOAuthComplete,
  onError,
}: GoogleSignInButtonProps) {
  const { t } = useI18n();
  const { pending, usesBrowserFallback, signIn } = useGoogleSignIn();

  const handlePress = async () => {
    try {
      const result = await signIn();
      if (result.type === 'cancelled') {
        return;
      }
      if (result.type === 'id-token') {
        onIdToken(result.idToken, result.nonce);
        return;
      }
      onOAuthComplete?.();
    } catch (error) {
      onError(error instanceof Error ? error.message : t('settings.signInFailed'));
    }
  };

  const isDisabled = disabled || pending;

  return (
    <>
      {usesBrowserFallback ? (
        <Text style={styles.fallbackHint}>{t('settings.nativeSignInFallback')}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={handlePress}
        style={[styles.button, styles.googleButton, isDisabled && styles.disabled]}
      >
        {pending ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.googleLabel}>{t('settings.signInGoogle')}</Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  disabled: {
    opacity: 0.55,
  },
  fallbackHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
});
