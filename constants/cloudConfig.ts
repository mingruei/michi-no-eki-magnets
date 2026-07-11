import Constants from 'expo-constants';
import { Platform } from 'react-native';

type CloudExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as CloudExtra;

export const cloudConfig = {
  supabaseUrl: extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  googleIosClientId:
    extra.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleAndroidClientId:
    extra.googleAndroidClientId ?? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  googleWebClientId:
    extra.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  cloudBackendName: 'Supabase',
};

export function getSupabaseOAuthCallbackUrl(): string {
  const base = cloudConfig.supabaseUrl.trim().replace(/\/$/, '');
  return `${base}/auth/v1/callback`;
}

export function getSupabaseOAuthOrigin(): string {
  return cloudConfig.supabaseUrl.trim().replace(/\/$/, '');
}

export function isCloudConfigured(): boolean {
  return (
    cloudConfig.supabaseUrl.trim().length > 0 && cloudConfig.supabaseAnonKey.trim().length > 0
  );
}

export function isGoogleSignInConfigured(): boolean {
  if (Platform.OS === 'web') {
    return isCloudConfigured();
  }

  const hasWebClientId = cloudConfig.googleWebClientId.trim().length > 0;

  if (Platform.OS === 'ios') {
    return hasWebClientId && cloudConfig.googleIosClientId.trim().length > 0;
  }

  if (Platform.OS === 'android') {
    // Android OAuth is tied to package + SHA-1 in Google Console; only webClientId is needed in-app.
    return hasWebClientId;
  }

  return false;
}
