import { Linking, Platform } from 'react-native';

import type { Castle } from '../types/castle';

function openUrl(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

function encodeLabel(label: string): string {
  return encodeURIComponent(label);
}

export function openMapsNavigation(latitude: number, longitude: number, label?: string) {
  const destination = `${latitude},${longitude}`;
  const query = label ? encodeLabel(label) : undefined;

  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
    android: query
      ? `geo:${destination}?q=${destination}(${query})`
      : `geo:${destination}?q=${destination}`,
    default: `https://www.openstreetmap.org/directions?to=${latitude}%2C${longitude}`,
  });

  if (url) {
    openUrl(url);
  }
}

export function openMapsParkingSearch(castle: Castle) {
  const query = encodeURIComponent(`${castle.name} 駐車場`);

  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.openstreetmap.org/search?query=${query}`,
  });

  if (url) {
    openUrl(url);
  }
}

export function openMapsStampLocation(castle: Castle) {
  const latitude = castle.stampLatitude ?? castle.latitude;
  const longitude = castle.stampLongitude ?? castle.longitude;
  const label = encodeURIComponent(`${castle.name} 100名城スタンプ`);
  const destination = `${latitude},${longitude}`;

  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${destination}&q=${label}`,
    android: `geo:${destination}?q=${destination}(${label})`,
    default: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`,
  });

  openUrl(url);
}
