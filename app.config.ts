import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: '日本名城',
  slug: 'japan-castles-map',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'japan-castles-map',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.japancastles.map',
  },
  android: {
    package: 'com.japancastles.map',
    versionCode: 1,
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
