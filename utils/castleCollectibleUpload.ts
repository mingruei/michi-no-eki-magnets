import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

import { normalizeFileUri } from './normalizeFileUri';

export type CollectibleUploadSource = 'scan' | 'file' | 'gallery';

export type CollectibleUploadSelection = {
  uri: string;
  mimeType: string | null;
  width?: number | null;
  height?: number | null;
};

function toSelection(
  uri: string | undefined,
  mimeType?: string | null,
  width?: number | null,
  height?: number | null,
): CollectibleUploadSelection | null {
  if (!uri) {
    return null;
  }

  return {
    uri: normalizeFileUri(uri),
    mimeType: mimeType ?? null,
    width: width ?? null,
    height: height ?? null,
  };
}

async function ensureAndroidCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

export async function pickCollectibleFromScan(): Promise<CollectibleUploadSelection[]> {
  if (Platform.OS === 'web') {
    return pickCollectibleFromFile();
  }

  const cameraGranted = await ensureAndroidCameraPermission();
  if (!cameraGranted) {
    throw new Error('camera-permission-denied');
  }

  const { scannedImages, status } = await DocumentScanner.scanDocument({
    croppedImageQuality: 92,
    responseType: ResponseType.ImageFilePath,
  });

  if (status === ScanDocumentResponseStatus.Cancel || !scannedImages?.length) {
    return [];
  }

  return scannedImages
    .map((uri) => toSelection(uri, 'image/jpeg'))
    .filter((selection): selection is CollectibleUploadSelection => selection != null);
}

export async function pickCollectibleFromGallery(): Promise<CollectibleUploadSelection[]> {
  if (Platform.OS !== 'web') {
    const granted = await ensureMediaLibraryPermission();
    if (!granted) {
      throw new Error('media-permission-denied');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return [];
  }

  const asset = result.assets[0];
  const selection = toSelection(
    asset.uri,
    asset.mimeType ?? 'image/jpeg',
    asset.width,
    asset.height,
  );
  return selection ? [selection] : [];
}

export async function pickCollectibleFromFile(): Promise<CollectibleUploadSelection[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return [];
  }

  const asset = result.assets[0];
  const selection = toSelection(asset.uri, asset.mimeType ?? null);
  return selection ? [selection] : [];
}

export async function pickCollectibleBySource(
  source: CollectibleUploadSource,
): Promise<CollectibleUploadSelection[]> {
  switch (source) {
    case 'scan':
      return pickCollectibleFromScan();
    case 'file':
      return pickCollectibleFromFile();
    case 'gallery':
      return pickCollectibleFromGallery();
  }
}
