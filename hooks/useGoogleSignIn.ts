import { useCallback, useState } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { cloudConfig, isCloudConfigured, isGoogleSignInConfigured } from '../constants/cloudConfig';
import { createGoogleSignInNonce } from '../utils/googleNonce';
import { getCurrentCloudSession, signInWithGoogleOAuthNative } from '../utils/supabaseClient';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let googleSignInModule: GoogleSignInModule | null = null;
let configured = false;

export function isNativeGoogleSignInLinked(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    if (TurboModuleRegistry.get('RNGoogleSignin') != null) {
      return true;
    }
  } catch {
    // Fall through to NativeModules check.
  }

  return NativeModules.RNGoogleSignin != null;
}

function canUseNativeGoogleSignIn(): boolean {
  return (
    Platform.OS !== 'web' &&
    isGoogleSignInConfigured() &&
    isNativeGoogleSignInLinked() &&
    cloudConfig.googleWebClientId.trim().length > 0
  );
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (googleSignInModule) {
    return googleSignInModule;
  }

  try {
    googleSignInModule = await import('@react-native-google-signin/google-signin');
    return googleSignInModule;
  } catch {
    return null;
  }
}

async function ensureGoogleConfigured(module: GoogleSignInModule): Promise<void> {
  if (configured) {
    return;
  }

  module.GoogleSignin.configure({
    webClientId: cloudConfig.googleWebClientId,
    iosClientId: cloudConfig.googleIosClientId || undefined,
    offlineAccess: false,
  });
  configured = true;
}

export type GoogleSignInResult =
  | { type: 'id-token'; idToken: string; nonce?: string }
  | { type: 'oauth' }
  | { type: 'cancelled' };

export function useGoogleSignIn() {
  const [pending, setPending] = useState(false);
  const usesBrowserFallback = Platform.OS !== 'web' && isCloudConfigured() && !canUseNativeGoogleSignIn();

  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    if (Platform.OS === 'web' || !isCloudConfigured()) {
      return { type: 'cancelled' };
    }

    setPending(true);

    try {
      if (canUseNativeGoogleSignIn()) {
        const module = await loadGoogleSignInModule();
        if (!module) {
          throw new Error('Native Google Sign-In module is not available in this build.');
        }

        await ensureGoogleConfigured(module);

        if (Platform.OS === 'android') {
          await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        if (Platform.OS === 'ios') {
          const { nonce, nonceDigest } = await createGoogleSignInNonce();
          const response = await module.GoogleSignin.signIn({ nonce: nonceDigest } as {
            nonce: string;
          });
          if (!module.isSuccessResponse(response) || !response.data.idToken) {
            return { type: 'cancelled' };
          }

          return { type: 'id-token', idToken: response.data.idToken, nonce };
        }

        const response = await module.GoogleSignin.signIn();
        if (!module.isSuccessResponse(response) || !response.data.idToken) {
          return { type: 'cancelled' };
        }

        return { type: 'id-token', idToken: response.data.idToken };
      }

      await signInWithGoogleOAuthNative();
      const session = await getCurrentCloudSession();
      if (!session) {
        return { type: 'cancelled' };
      }

      return { type: 'oauth' };
    } catch (error: unknown) {
      if (canUseNativeGoogleSignIn()) {
        const module = await loadGoogleSignInModule();
        const code =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code?: string }).code
            : undefined;

        if (
          module &&
          (code === module.statusCodes.IN_PROGRESS ||
            code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE ||
            code === module.statusCodes.SIGN_IN_CANCELLED)
        ) {
          return { type: 'cancelled' };
        }
      }

      throw error;
    } finally {
      setPending(false);
    }
  }, []);

  return {
    pending,
    usesBrowserFallback,
    signIn,
  };
}
