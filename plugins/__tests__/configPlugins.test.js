jest.mock('@expo/config-plugins', () => ({
  withInfoPlist: jest.fn((config, callback) => {
    callback({ modResults: {} });
    return config;
  }),
  withAppBuildGradle: jest.fn((config, callback) => {
    callback({
      modResults: {
        language: 'groovy',
        contents: 'android { defaultConfig { versionCode 1 } }',
      },
    });
    return config;
  }),
  withDangerousMod: jest.fn((config, pair) => {
    const [, mod] = pair;
    return mod(config);
  }),
  withXcodeProject: jest.fn((config, callback) => {
    callback({
      modResults: {
        getTarget: jest.fn(() => ({ uuid: 'target-uuid' })),
        getFirstTarget: jest.fn(() => ({ uuid: 'fallback-uuid' })),
        hash: { project: { objects: { PBXShellScriptBuildPhase: {} } } },
        addBuildPhase: jest.fn(),
      },
      modRequest: { projectRoot: '/tmp/project' },
    });
    return config;
  }),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');

const { withAppBuildGradle, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const permissionMessages = require('../permissionMessages');
const withAndroidReleaseFileName = require('../withAndroidReleaseFileName');
const withAndroidReleaseSigning = require('../withAndroidReleaseSigning');
const withFmtXcode26Fix = require('../withFmtXcode26Fix');
const withIosUsageDescriptions = require('../withIosUsageDescriptions');
const withHermesDsym = require('../withHermesDsym');

describe('permissionMessages', () => {
  it('defines non-empty permission copy for all native prompts', () => {
    expect(permissionMessages.location.length).toBeGreaterThan(0);
    expect(permissionMessages.photo.length).toBeGreaterThan(0);
    expect(permissionMessages.camera.length).toBeGreaterThan(0);
  });
});

describe('withIosUsageDescriptions', () => {
  it('writes required iOS permission usage descriptions', () => {
    withIosUsageDescriptions({ name: 'test', slug: 'test' });

    expect(withInfoPlist).toHaveBeenCalled();
    const callback = withInfoPlist.mock.calls[0][1];
    const result = callback({ modResults: {} });

    expect(result.modResults.NSLocationWhenInUseUsageDescription).toBe(permissionMessages.location);
    expect(result.modResults.NSLocationAlwaysUsageDescription).toBe(permissionMessages.location);
    expect(result.modResults.NSLocationAlwaysAndWhenInUseUsageDescription).toBe(
      permissionMessages.location,
    );
    expect(result.modResults.NSPhotoLibraryUsageDescription).toBe(permissionMessages.photo);
    expect(result.modResults.NSCameraUsageDescription).toBe(permissionMessages.camera);
  });
});

describe('withHermesDsym', () => {
  it('locates the iOS application target by product type', () => {
    const fs = require('fs');
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);

    withHermesDsym({ name: 'test', slug: 'test' });

    expect(withXcodeProject).toHaveBeenCalled();
    const callback = withXcodeProject.mock.calls.at(-1)[1];
    const project = {
      getTarget: jest.fn((productType) =>
        productType === 'com.apple.product-type.application'
          ? { uuid: 'target-uuid' }
          : null,
      ),
      getFirstTarget: jest.fn(() => ({ uuid: 'fallback-uuid' })),
      hash: { project: { objects: { PBXShellScriptBuildPhase: {} } } },
      addBuildPhase: jest.fn(),
    };

    callback({
      modResults: project,
      modRequest: { projectRoot: '/tmp/project' },
    });

    expect(project.getTarget).toHaveBeenCalledWith('com.apple.product-type.application');
    expect(project.addBuildPhase).toHaveBeenCalledWith(
      [],
      'PBXShellScriptBuildPhase',
      'Generate Hermes dSYM',
      'target-uuid',
      expect.objectContaining({ shellPath: '/bin/sh' }),
    );

    fs.mkdirSync.mockRestore();
    fs.copyFileSync.mockRestore();
    fs.chmodSync.mockRestore();
  });

  it('throws when no application target exists', () => {
    const fs = require('fs');
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);

    withHermesDsym({ name: 'test-throw', slug: 'test-throw' });
    const callback = withXcodeProject.mock.calls.at(-1)[1];
    const project = {
      getTarget: jest.fn(() => null),
      getFirstTarget: jest.fn(() => null),
      hash: { project: { objects: { PBXShellScriptBuildPhase: {} } } },
      addBuildPhase: jest.fn(),
    };

    expect(() =>
      callback({
        modResults: project,
        modRequest: { projectRoot: '/tmp/project' },
      }),
    ).toThrow('Could not find iOS application target for Hermes dSYM script.');

    fs.mkdirSync.mockRestore();
    fs.copyFileSync.mockRestore();
    fs.chmodSync.mockRestore();
  });

  it('does not add duplicate Hermes dSYM build phases', () => {
    const fs = require('fs');
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);

    withHermesDsym({ name: 'test-dedupe', slug: 'test-dedupe' });
    const callback = withXcodeProject.mock.calls.at(-1)[1];
    const addBuildPhase = jest.fn();
    const project = {
      getTarget: jest.fn(() => ({ uuid: 'target-uuid' })),
      getFirstTarget: jest.fn(),
      hash: {
        project: {
          objects: {
            PBXShellScriptBuildPhase: {
              existing: { shellScript: '"generate-hermes-dsym.sh"\n' },
            },
          },
        },
      },
      addBuildPhase,
    };

    callback({
      modResults: project,
      modRequest: { projectRoot: '/tmp/project' },
    });

    expect(addBuildPhase).not.toHaveBeenCalled();

    fs.mkdirSync.mockRestore();
    fs.copyFileSync.mockRestore();
    fs.chmodSync.mockRestore();
  });
});

describe('withAndroidReleaseFileName', () => {
  it('appends release artifact renaming snippet to build.gradle', () => {
    withAndroidReleaseFileName({ name: 'test', slug: 'test' });

    expect(withAppBuildGradle).toHaveBeenCalled();
    const callback = withAppBuildGradle.mock.calls.at(-1)[1];
    const config = {
      modResults: {
        language: 'groovy',
        contents: 'android { defaultConfig { versionCode 1 } }',
      },
    };

    const result = callback(config);
    expect(result.modResults.contents).toContain('release-artifact-file-name');
    expect(result.modResults.contents).toContain('bundleRelease');
  });

  it('skips non-groovy gradle files and duplicate snippets', () => {
    withAndroidReleaseFileName({ name: 'kotlin', slug: 'kotlin' });
    const kotlinCallback = withAppBuildGradle.mock.calls.at(-1)[1];
    const kotlinResult = kotlinCallback({
      modResults: { language: 'kotlin', contents: 'plugins {}' },
    });
    expect(kotlinResult.modResults.contents).toBe('plugins {}');

    withAndroidReleaseFileName({ name: 'dedupe', slug: 'dedupe' });
    const dedupeCallback = withAppBuildGradle.mock.calls.at(-1)[1];
    const dedupeResult = dedupeCallback({
      modResults: {
        language: 'groovy',
        contents: '// @generated begin release-artifact-file-name',
      },
    });
    expect(dedupeResult.modResults.contents).toBe(
      '// @generated begin release-artifact-file-name',
    );
  });
});

describe('withAndroidReleaseSigning', () => {
  it('appends keystore.properties signing helpers with home-path support', () => {
    withAndroidReleaseSigning({ name: 'test', slug: 'test' });

    expect(withAppBuildGradle).toHaveBeenCalled();
    const callback = withAppBuildGradle.mock.calls.at(-1)[1];
    const result = callback({
      modResults: {
        language: 'groovy',
        contents: `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}`,
      },
    });

    expect(result.modResults.contents).toContain(
      'android-release-signing-from-keystore-properties',
    );
    expect(result.modResults.contents).toContain('japanCastlesResolveStoreFile');
    expect(result.modResults.contents).toContain('japan-castles-release-signing-config');
    expect(result.modResults.contents).toContain('user.home');
    expect(result.modResults.contents).toContain('validateSigningRelease');
    expect(result.modResults.contents).toContain(
      'signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug',
    );
  });

  it('rewrites file(keystoreProperties[storeFile]) to expand home paths', () => {
    withAndroidReleaseSigning({ name: 'legacy', slug: 'legacy' });
    const callback = withAppBuildGradle.mock.calls.at(-1)[1];
    const result = callback({
      modResults: {
        language: 'groovy',
        contents: `
android {
  signingConfigs {
    debug {
      storeFile file('debug.keystore')
    }
    release {
      storeFile file(keystoreProperties['storeFile'])
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.debug
    }
  }
}
`,
      },
    });

    expect(result.modResults.contents).toContain(
      "storeFile japanCastlesResolveStoreFile(keystoreProperties['storeFile'])",
    );
    expect(result.modResults.contents).not.toContain(
      "storeFile file(keystoreProperties['storeFile'])",
    );
  });

  it('skips non-groovy gradle files and replaces prior generated snippets', () => {
    withAndroidReleaseSigning({ name: 'kotlin', slug: 'kotlin' });
    const kotlinCallback = withAppBuildGradle.mock.calls.at(-1)[1];
    const kotlinResult = kotlinCallback({
      modResults: { language: 'kotlin', contents: 'plugins {}' },
    });
    expect(kotlinResult.modResults.contents).toBe('plugins {}');

    withAndroidReleaseSigning({ name: 'replace', slug: 'replace' });
    const replaceCallback = withAppBuildGradle.mock.calls.at(-1)[1];
    const replaceResult = replaceCallback({
      modResults: {
        language: 'groovy',
        contents: `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}

// @generated begin android-release-signing-from-keystore-properties
OLD_SNIPPET
// @generated end android-release-signing-from-keystore-properties
`,
      },
    });
    expect(replaceResult.modResults.contents).not.toContain('OLD_SNIPPET');
    expect(replaceResult.modResults.contents).toContain('japanCastlesApplyReleaseSigning');
  });
});

describe('withFmtXcode26Fix', () => {
  it('inserts fmt workaround into Podfile post_install', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-fix-'));
    const podfilePath = path.join(tempDir, 'Podfile');
    fs.writeFileSync(
      podfilePath,
      [
        "post_install do |installer|",
        "  react_native_post_install(installer)",
        "end",
      ].join('\n'),
    );

    withFmtXcode26Fix({
      name: 'test',
      slug: 'test',
      modRequest: { platformProjectRoot: tempDir },
    });

    const updated = fs.readFileSync(podfilePath, 'utf8');
    expect(updated).toContain('Xcode 26 workaround');
    expect(updated).toContain('FMT_USE_CONSTEVAL 0');
  });
});
