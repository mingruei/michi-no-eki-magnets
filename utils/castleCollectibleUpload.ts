import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

import { normalizeFileUri } from './normalizeFileUri';
import { waitForNativePicker } from './waitForNativePicker';

const DOCUMENT_PICKER_TIMEOUT_MS = 120_000;

const DOCUMENT_PICKER_TYPES =
  Platform.OS === 'ios'
    ? ([
        'public.image',
        'public.jpeg',
        'public.png',
        'public.heic',
        'com.adobe.pdf',
        'image/*',
        'application/pdf',
      ] as const)
    : (['image/*', 'application/pdf'] as const);

export type CollectibleUploadSource = 'scan' | 'file' | 'gallery';

export type CollectibleUploadSelection = {
  uri: string;
  mimeType: string | null;
  width?: number | null;
  height?: number | null;
  base64?: string | null;
};

function toSelection(
  uri: string | undefined,
  mimeType?: string | null,
  width?: number | null,
  height?: number | null,
  base64?: string | null,
): CollectibleUploadSelection | null {
  if (!uri) {
    return null;
  }

  return {
    uri: normalizeFileUri(uri),
    mimeType: mimeType ?? null,
    width: width ?? null,
    height: height ?? null,
    base64: base64 ?? null,
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

async function withPickerTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('picker-timeout'));
    }, DOCUMENT_PICKER_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function pickCollectibleFromScan(): Promise<CollectibleUploadSelection[]> {
  if (Platform.OS === 'web') {
    return pickCollectibleFromFile();
  }

  await waitForNativePicker();

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
    await waitForNativePicker();

    const granted = await ensureMediaLibraryPermission();
    if (!granted) {
      throw new Error('media-permission-denied');
    }
  }

  const result = await withPickerTimeout(
    ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
      base64: Platform.OS === 'android',
    }),
  );

  if (result.canceled || !result.assets?.[0]) {
    return [];
  }

  const asset = result.assets[0];
  const selection = toSelection(
    asset.uri,
    asset.mimeType ?? 'image/jpeg',
    asset.width,
    asset.height,
    asset.base64,
  );
  return selection ? [selection] : [];
}

export async function pickCollectibleFromFile(): Promise<CollectibleUploadSelection[]> {
  await waitForNativePicker();

  const result = await withPickerTimeout(
    DocumentPicker.getDocumentAsync({
      type: [...DOCUMENT_PICKER_TYPES],
      copyToCacheDirectory: true,
      multiple: false,
    }),
  );

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
