# 日本道之駅磁鐵收集帳 (Michi-no-Eki Magnets)

Cross-platform mobile app (iOS + Android) built with **Expo** and **React Native**. Collect **道之駅磁鐵** (michi-no-eki souvenir magnets) across Japan:

- Interactive map and list
- Visit and magnet collection progress
- Photo upload, groups, and ZIP backup/sync

## Features

- OpenStreetMap with station markers across Japan (no API key required)
- Filter by region, prefecture, progress, and groups
- Station detail screen with visit tracking and magnet photos
- Optional **cloud sync** for station data via Supabase
- Works on iPhone, iPad, Android, and web (PWA)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/) (via `npx expo`)

## Setup

```bash
cd ~/Projects/michi-no-eki-magnets
npm install
npx expo start
```

## Data source

Station data is imported from [LinkData 道の駅 dataset (rdf1s2861i)](http://ja.linkdata.org/work/rdf1s2861i), based on **国土数値情報（道の駅データ）** (MLIT).

```bash
# Fetch latest LinkData CSV and regenerate assets/stations.json
npm run build:stations

# Rebuild from cached data-source/linkdata-roadside-station.csv
npm run build:stations:offline
```

Attribution (required for non-commercial use):

> 「国土数値情報（道の駅データ）」（国土交通省）をもとに東京福祉専門学校IT医療ソーシャルワーカー科作成

## Scripts

```bash
npm test
npm run generate:station-data-manifest
```

## License

See [LICENSE](LICENSE).
