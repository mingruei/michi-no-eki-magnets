import * as Crypto from 'expo-crypto';

export type GoogleSignInNonce = {
  /** Raw nonce passed to Supabase `signInWithIdToken`. */
  nonce: string;
  /** SHA-256 hex digest passed to native Google Sign-In. */
  nonceDigest: string;
};

export async function createGoogleSignInNonce(): Promise<GoogleSignInNonce> {
  const nonce = Crypto.randomUUID();
  const nonceDigest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );

  return { nonce, nonceDigest };
}
