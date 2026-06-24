# Japan Castles Map

Cross-platform mobile app (iOS + Android) built with **Expo** and **React Native**. Explore all **200 famous castles of Japan** on an interactive map:

- **日本100名城** (Japan's 100 Famous Castles) — blue markers
- **続日本100名城** (Continued 100 Famous Castles) — red markers

## Features

- OpenStreetMap with 200 castle markers across Japan (no API key required)
- Filter by series, region, and prefecture
- Castle detail screen with visit tracking (登城 / 名城章 / 御城印)
- Works on iPhone, iPad, Android, and web (PWA)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/) (via `npx expo`)

For device builds you will also need:

- **iOS:** Xcode + Apple Developer account (for App Store)
- **Android:** Android Studio + Google Play Developer account (for Play Store)

## Setup

```bash
cd ~/Projects/japan-castles-map
npm install
```

## Run locally

```bash
npm start
```

Then scan the QR code with **Expo Go**, or press `i` for iOS simulator / `a` for Android emulator.

For web:

```bash
npm run web
```

## Castle data

Castle locations are stored in `assets/castles.json`.

- **日本100名城** coordinates come from [100sen.cyber-ninja.jp](https://100sen.cyber-ninja.jp/) (CC-friendly open survey data)
- **続日本100名城** list follows the [Japan Castle Association](https://jokaku.jp/business/great-castles-sequel/) official selection
- Metadata for the first 100 castles is enriched from [tcunningham203/100-famous-castles](https://github.com/tcunningham203/100-famous-castles)

Regenerate the dataset:

```bash
python3 scripts/build-castles-json.py
```

Traditional Chinese castle detail text can be added in `data-source/castle-content.zh-Hant.json`.

## Project structure

```
App.tsx                  # Main screen
components/
  CastleMap.tsx          # OpenStreetMap + markers (native WebView)
  CastleMap.web.tsx      # OpenStreetMap + markers (web)
  CastleDetailScreen.tsx # Castle detail + visit checkboxes
assets/castles.json      # 200 castle records
scripts/build-castles-json.py
```

## Build for stores

### Google Play (Android)

**Prerequisites**

1. [Google Play Console](https://play.google.com/console) developer account (one-time USD 25 fee)
2. [Expo account](https://expo.dev/signup) (free tier works)
3. Git repository with at least one commit (required by EAS Build)

**One-time setup**

```bash
cd ~/Projects/japan-castles-map
npm install -g eas-cli   # or use: npx eas-cli
eas login
git add . && git commit -m "Prepare for Google Play release"
eas build:configure      # links project to Expo if prompted
```

In [Google Play Console](https://play.google.com/console), create an app and use this package name:

`com.japancastles.map`

It must match `app.config.ts` exactly.

**Build the release (.aab)**

```bash
npm run build:android
# same as: eas build --platform android --profile production
```

EAS builds an **Android App Bundle** (`.aab`) in the cloud. Download it from the link in the terminal or from [expo.dev](https://expo.dev).

**Upload to Google Play**

Option A — manual (simplest for first release):

1. Play Console → your app → **Testing → Internal testing** (or Production)
2. **Create new release** → upload the `.aab`
3. Complete store listing, content rating, privacy policy, and screenshots
4. Submit for review

Option B — EAS Submit (after setting up a Google service account):

```bash
npm run submit:android
```

**Before each update**

- Bump `version` in `app.config.ts` (e.g. `1.0.1`)
- `versionCode` is auto-incremented by EAS (`autoIncrement: true` in `eas.json`)

### iOS (App Store)

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

See [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/) for details.

## License

MIT — see [LICENSE](LICENSE). Castle data attributions are noted in `scripts/build-castles-json.py`.
