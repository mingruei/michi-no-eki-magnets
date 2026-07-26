import * as Location from 'expo-location';
import { Platform } from 'react-native';

import {
  distanceInMeters,
  findNearestCastleWithinRadius,
  resolveLocalPrefectureFilter,
  resolveLocalStartupContext,
} from '../localPrefecture';
import { createCastle } from './fixtures';

const mockedGetPermissions = Location.getForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.getForegroundPermissionsAsync
>;
const mockedRequestPermissions = Location.requestForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.requestForegroundPermissionsAsync
>;
const mockedGetPosition = Location.getCurrentPositionAsync as jest.MockedFunction<
  typeof Location.getCurrentPositionAsync
>;
const mockedReverseGeocode = Location.reverseGeocodeAsync as jest.MockedFunction<
  typeof Location.reverseGeocodeAsync
>;

describe('localPrefecture', () => {
  describe('distanceInMeters', () => {
    it('returns zero for identical coordinates', () => {
      expect(distanceInMeters(35.0116, 135.7681, 35.0116, 135.7681)).toBe(0);
    });

    it('returns a positive distance for nearby points', () => {
      const distance = distanceInMeters(35.0116, 135.7681, 35.0216, 135.7781);
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(2000);
    });
  });

  describe('findNearestCastleWithinRadius', () => {
    const castles = [
      createCastle({ id: 1, name: 'A', latitude: 35.0, longitude: 135.0 }),
      createCastle({ id: 2, name: 'B', latitude: 35.0004, longitude: 135.0004 }),
    ];

    it('returns the nearest castle within radius', () => {
      const nearest = findNearestCastleWithinRadius(castles, 35.0, 135.0, 100);
      expect(nearest?.id).toBe(1);
    });

    it('returns null when no castle is within radius', () => {
      expect(findNearestCastleWithinRadius(castles, 36.0, 136.0, 1000)).toBeNull();
    });
  });

  describe('resolveLocalStartupContext', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      mockedGetPermissions.mockResolvedValue({ status: 'denied' } as never);
      mockedRequestPermissions.mockResolvedValue({ status: 'denied' } as never);
    });

    it('returns empty context when location permission is denied', async () => {
      const result = await resolveLocalStartupContext([createCastle()]);
      expect(result).toEqual({ filter: null, nearbyCastle: null });
    });

    it('returns prefecture filter and nearby castle when location is granted in Japan', async () => {
      const castles = [
        createCastle({ id: 1, prefecture: '京都府', latitude: 35.0116, longitude: 135.7681 }),
        createCastle({ id: 2, prefecture: '京都府', latitude: 35.0117, longitude: 135.7682 }),
      ];

      mockedGetPermissions.mockResolvedValue({ status: 'granted' } as never);
      mockedGetPosition.mockResolvedValue({
        coords: { latitude: 35.0116, longitude: 135.7681 },
      } as never);
      mockedReverseGeocode.mockResolvedValue([{ subregion: '京都府' }] as never);

      const result = await resolveLocalStartupContext(castles, 100);

      expect(result.filter).toEqual({
        regionId: 'kinki',
        prefecture: '京都府',
      });
      expect(result.nearbyCastle?.id).toBe(1);
    });

    it('falls back to nearest castle prefecture when geocoding fails', async () => {
      const castles = [
        createCastle({ id: 1, prefecture: '京都府', latitude: 35.0116, longitude: 135.7681 }),
        createCastle({ id: 2, prefecture: '大阪府', latitude: 34.6937, longitude: 135.5023 }),
      ];

      mockedGetPermissions.mockResolvedValue({ status: 'granted' } as never);
      mockedGetPosition.mockResolvedValue({
        coords: { latitude: 35.0116, longitude: 135.7681 },
      } as never);
      mockedReverseGeocode.mockResolvedValue([] as never);

      const result = await resolveLocalStartupContext(castles, 100);

      expect(result.filter?.prefecture).toBe('京都府');
    });

    it('uses the nearby castle prefecture on prefecture borders (Tsuwano / Shimane)', async () => {
      // Shimane centroid is pulled toward Matsue; Yamaguchi centroid is much closer to
      // Tsuwano. Reverse geocode may also return Yamaguchi near the border.
      const castles = [
        createCastle({
          id: 1,
          name: '松江城',
          prefecture: '島根県',
          latitude: 35.475,
          longitude: 133.0506,
        }),
        createCastle({
          id: 2,
          name: '津和野城',
          prefecture: '島根県',
          latitude: 34.460833,
          longitude: 131.764167,
        }),
        createCastle({
          id: 3,
          name: '萩城',
          prefecture: '山口県',
          latitude: 34.4222,
          longitude: 131.3981,
        }),
        createCastle({
          id: 4,
          name: '岩国城',
          prefecture: '山口県',
          latitude: 34.1753,
          longitude: 132.1744,
        }),
      ];

      mockedGetPermissions.mockResolvedValue({ status: 'granted' } as never);
      mockedGetPosition.mockResolvedValue({
        coords: { latitude: 34.460833, longitude: 131.764167 },
      } as never);
      mockedReverseGeocode.mockResolvedValue([{ region: '山口県' }] as never);

      const result = await resolveLocalStartupContext(castles, 100);

      expect(result.filter?.prefecture).toBe('島根県');
      expect(result.nearbyCastle?.name).toBe('津和野城');
    });
  });
});
