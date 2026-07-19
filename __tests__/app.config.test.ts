import config from '../app.config';

describe('app.config', () => {
  it('defines user-facing and Android version metadata', () => {
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.android?.versionCode).toBeGreaterThan(0);
    expect(config.android?.versionCode).toBeGreaterThanOrEqual(40);
    expect(config.ios?.buildNumber).toBeTruthy();
  });

  it('includes required iOS permission usage descriptions', () => {
    const infoPlist = config.ios?.infoPlist ?? {};
    expect(infoPlist.NSLocationWhenInUseUsageDescription).toBeTruthy();
    expect(infoPlist.NSCameraUsageDescription).toBeTruthy();
    expect(infoPlist.NSPhotoLibraryUsageDescription).toBeTruthy();
  });

  it('registers native config plugins that guard against recent regressions', () => {
    const plugins = config.plugins ?? [];
    const pluginIds = plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));

    expect(pluginIds).toContain('./plugins/withIosUsageDescriptions.js');
    expect(pluginIds).toContain('./plugins/withHermesDsym.js');
    expect(pluginIds).toContain('expo-location');
  });
});
