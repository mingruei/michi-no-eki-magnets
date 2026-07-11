import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../constants/theme';
import { useI18n } from '../i18n';
import { getGoogleAuthErrorMessage } from '../utils/authErrors';
import { signInWithGoogleOAuth } from '../utils/supabaseClient';

type GoogleSignInButtonProps = {
  disabled?: boolean;
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({ disabled = false, onError }: GoogleSignInButtonProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  const handlePress = async () => {
    setPending(true);
    try {
      await signInWithGoogleOAuth();
    } catch (error) {
      setPending(false);
      onError(getGoogleAuthErrorMessage(error, t));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || pending}
      onPress={handlePress}
      style={[styles.button, styles.googleButton, (disabled || pending) && styles.disabled]}
    >
      {pending ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={styles.googleLabel}>{t('settings.signInGoogle')}</Text>
      )}
    </Pressable>
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
});
