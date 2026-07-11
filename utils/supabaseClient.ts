import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

import { cloudConfig, isCloudConfigured } from '../constants/cloudConfig';
import type { Database } from '../types/supabase';
import type { CloudSession } from './cloudSettingsStorage';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!isCloudConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });

    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (!supabaseClient) {
          return;
        }

        if (state === 'active') {
          supabaseClient.auth.startAutoRefresh();
        } else {
          supabaseClient.auth.stopAutoRefresh();
        }
      });
    }
  }

  return supabaseClient;
}

export function sessionFromSupabaseUser(user: User): CloudSession {
  return {
    provider: 'google',
    userId: user.id,
    email: user.email ?? null,
  };
}

export async function getCurrentCloudSession(): Promise<CloudSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return null;
  }

  return sessionFromSupabaseUser(data.session.user);
}

export async function signInWithGoogleIdToken(
  idToken: string,
  nonce?: string,
): Promise<CloudSession> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    ...(nonce ? { nonce } : {}),
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Google sign-in did not return a user');
  }

  return sessionFromSupabaseUser(data.user);
}

function parseAuthRedirectParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?').slice(1).join('?') : '';
  const paramString = [fragment, query].filter(Boolean).join('&');

  for (const part of paramString.split('&')) {
    if (!part) {
      continue;
    }
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = decodeURIComponent(part.slice(0, separatorIndex));
    const value = decodeURIComponent(part.slice(separatorIndex + 1));
    params[key] = value;
  }

  return params;
}

async function createSessionFromRedirectUrl(url: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const params = parseAuthRedirectParams(url);

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw error;
    }
    return;
  }

  if (params.access_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? '',
    });
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error('Google sign-in did not return auth credentials');
}

export async function signInWithGoogleOAuth(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithGoogleOAuthNative(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('Google sign-in did not return an authorization URL');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return;
  }

  await createSessionFromRedirectUrl(result.url);
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSignedInSupabaseUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user;
}
