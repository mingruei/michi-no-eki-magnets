import type { ExpoConfig } from 'expo/config';

const locationPermissionMessage = '用於依您目前位置自動篩選所在地方與府縣。';

const config: ExpoConfig = {
  name: '日本名城',
  slug: 'japan-castles-map',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'japan-castles-map',
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission: locationPermissionMessage,
      },
    ],
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
    },
  },
  android: {
    package: 'com.japancastles.map',
    versionCode: 1,
    allowBackup: true,
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
    name: '日本名城',
    shortName: '日本名城',
    description: '日本100名城 + 續日本100名城',
    themeColor: '#2563EB',
    backgroundColor: '#F8FAFC',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'zh-Hant',
    bundler: 'metro',
  },
};

export default config;
