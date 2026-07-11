import { getSupabaseOAuthCallbackUrl } from '../constants/cloudConfig';

type AuthErrorLike = {
  message?: string;
  msg?: string;
  error_code?: string;
};

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function getGoogleAuthErrorMessage(error: unknown, t: TranslateFn): string {
  const authError = error as AuthErrorLike;
  const text = `${authError.message ?? ''} ${authError.msg ?? ''}`.toLowerCase();

  if (text.includes('missing oauth secret')) {
    return t('settings.oauthSecretMissing');
  }

  if (text.includes('redirect_uri_mismatch')) {
    return t('settings.oauthRedirectMismatch', {
      callbackUrl: getSupabaseOAuthCallbackUrl(),
    });
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof authError.msg === 'string' && authError.msg.trim().length > 0) {
    return authError.msg;
  }

  return t('settings.signInFailed');
}
