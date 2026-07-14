import type { ExpoConfig } from 'expo/config';

const locationPermissionMessage = '用於依您目前位置自動篩選所在地方與府縣。';
const photoPermissionMessage = '用於上傳御城印與城卡照片。';
const cameraPermissionMessage = '用於掃描御城印與城卡。';

const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

const config: ExpoConfig = {
  name: '攻城師',
  slug: 'japan-castles-map',
  version: '1.1.0',
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
        locationWhenInUsePermission: locationPermissionMessage,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: photoPermissionMessage,
        cameraPermission: cameraPermissionMessage,
      },
    ],
    [
      'react-native-document-scanner-plugin',
      {
        cameraPermission: cameraPermissionMessage,
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
    './plugins/withHermesDsym.js',
  ],
  extra: {
    eas: {
      projectId: 'a381aae1-a8d8-4d8f-9af8-47dc03fb19e4',
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.japancastles.map',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: locationPermissionMessage,
      NSPhotoLibraryUsageDescription: photoPermissionMessage,
      NSCameraUsageDescription: cameraPermissionMessage,
      LSApplicationQueriesSchemes: ['comgooglemaps', 'comgooglemapsurl'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.japancastles.map',
    versionCode: 38,
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
  web: {
    favicon: './assets/favicon.png',
    name: '攻城師',
    shortName: '攻城師',
    description: '日本100名城 + 續日本100名城',
    themeColor: '#1A2744',
    backgroundColor: '#F8FAFC',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'zh-Hant',
    bundler: 'metro',
  },
};

export default config;
