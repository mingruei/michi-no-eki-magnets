import { File } from 'expo-file-system';

import { normalizeFileUri } from './normalizeFileUri';

export async function readSourceBytes(sourceUri: string): Promise<Uint8Array> {
  const candidates = [normalizeFileUri(sourceUri), sourceUri].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  for (const uri of candidates) {
    try {
      const sourceFile = new File(uri);
      if (sourceFile.exists) {
        const bytes = await sourceFile.bytes();
        if (bytes.length > 0) {
          return bytes;
        }
      }
    } catch {
      // Try the next URI format or fetch fallback.
    }

    try {
      const response = await fetch(uri);
      if (!response.ok) {
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 0) {
        return bytes;
      }
    } catch {
      // Try the next URI format.
    }
  }

  throw new Error('Failed to read selected file');
}

export function getDisplayImageUri(uri: string): string {
  const trimmed = uri.trim();
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  return trimmed;
}
