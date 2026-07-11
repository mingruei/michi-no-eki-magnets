import { Directory, File, Paths } from 'expo-file-system';

import { readSourceBytes } from './collectibleFileIO';
import { normalizeFileUri } from './normalizeFileUri';

const UPLOAD_CACHE_DIR = 'upload-cache';

function ensureUploadCacheDirectory(): Directory {
  const directory = new Directory(Paths.cache, UPLOAD_CACHE_DIR);
  if (!directory.exists) {
    directory.create({ idempotent: true });
  }
  return directory;
}

export async function persistUploadImage(
  sourceUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const bytes = await readSourceBytes(sourceUri);
  const directory = ensureUploadCacheDirectory();
  const extension = mimeType.includes('png') ? '.png' : '.jpg';
  const destination = directory.createFile(`upload-${Date.now()}${extension}`, mimeType);

  destination.write(bytes);

  if (!destination.exists) {
    throw new Error('Failed to persist upload image');
  }

  return normalizeFileUri(destination.uri);
}
