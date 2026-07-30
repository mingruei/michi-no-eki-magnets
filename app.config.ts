import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const permissionMessages = require('./plugins/permissionMessages') as {
  location: string;
  photo: string;
  camera: string;
};

const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

const config: ExpoConfig = {
  name: '攻城師',
  slug: 'japan-castles-map',
  version: '1.3.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'japan-castles-map',
  plugins: [
    ...(isProductionBuild ? [] : (['expo-dev-client'] as const)),
    'expo-screen-orientation',
    [
      'expo-location',
      {
        locationWhenInUsePermission: permissionMessages.location,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: permissionMessages.photo,
        cameraPermission: permissionMessages.camera,
      },
    ],
    [
      'react-native-document-scanner-plugin',
      {
        cameraPermission: permissionMessages.camera,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
        ios: {
          deploymentTarget: '16.4',
          buildReactNativeFromSource: true,
        },
      },
    ],
    './plugins/withFmtXcode26Fix.js',
    './plugins/withIosUsageDescriptions.js',
    './plugins/withHermesDsym.js',
    './plugins/withAndroidReleaseFileName.js',
    './plugins/withAndroidReleaseSigning.js',
  ],
  extra: {
    eas: {
      projectId: 'a381aae1-a8d8-4d8f-9af8-47dc03fb19e4',
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.japancastles.map',
    buildNumber: '8',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: permissionMessages.location,
      NSLocationAlwaysUsageDescription: permissionMessages.location,
      NSLocationAlwaysAndWhenInUseUsageDescription: permissionMessages.location,
      NSPhotoLibraryUsageDescription: permissionMessages.photo,
      NSCameraUsageDescription: permissionMessages.camera,
      LSApplicationQueriesSchemes: ['comgooglemaps', 'comgooglemapsurl'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.japancastles.map',
    versionCode: 46,
    allowBackup: true,
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'resize',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
    ],
    adaptiveIcon: {
      backgroundColor: '#1A2744',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
};

export default config;
