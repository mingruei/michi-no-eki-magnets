import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { CastleProgressMap } from '../types/castleProgress';
import { normalizeProgressMap } from './mergeProgressMap';

const LEGACY_ASYNC_STORAGE_KEY = 'castle-progress-v1';
const PROGRESS_FILE_NAME = 'castle-progress-v1.json';

function getProgressFile(): File {
  return new File(Paths.document, PROGRESS_FILE_NAME);
}

async function loadFromDocumentFile(): Promise<CastleProgressMap | null> {
  const file = getProgressFile();

  if (!file.exists) {
    return null;
  }

  const raw = await file.text();
  return normalizeProgressMap(JSON.parse(raw));
}

async function migrateFromAsyncStorage(): Promise<CastleProgressMap> {
  const legacy = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
  if (!legacy) {
    return {};
  }

  const map = normalizeProgressMap(JSON.parse(legacy));
  await saveProgressMap(map);
  await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
  return map;
}

export async function loadProgressMap(): Promise<CastleProgressMap> {
  if (Platform.OS === 'web') {
    try {
      const legacy = localStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
      return normalizeProgressMap(legacy ? JSON.parse(legacy) : {});
    } catch {
      return {};
    }
  }

  try {
    const fromFile = await loadFromDocumentFile();
    if (fromFile) {
      return fromFile;
    }

    return await migrateFromAsyncStorage();
  } catch {
    try {
      return await migrateFromAsyncStorage();
    } catch {
      return {};
    }
  }
}

export async function saveProgressMap(map: CastleProgressMap): Promise<void> {
  const payload = JSON.stringify(map);

  if (Platform.OS === 'web') {
    localStorage.setItem(LEGACY_ASYNC_STORAGE_KEY, payload);
    return;
  }

  getProgressFile().write(payload);
}
