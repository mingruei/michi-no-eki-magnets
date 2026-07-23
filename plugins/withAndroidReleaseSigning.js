const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'release-signing-config';

const KEYSTORE_LOADER = `
// @generated begin ${MARKER}
def releaseKeystorePropertiesFile = rootProject.file("keystore.properties")
def releaseKeystoreProperties = new Properties()
if (releaseKeystorePropertiesFile.exists()) {
    releaseKeystoreProperties.load(new FileInputStream(releaseKeystorePropertiesFile))
}

gradle.taskGraph.whenReady { taskGraph ->
    def requiresUploadKeystore = taskGraph.hasTask(':app:bundleRelease') ||
        taskGraph.hasTask(':app:assembleRelease')
    if (requiresUploadKeystore && !releaseKeystorePropertiesFile.exists()) {
        throw new GradleException(
            "Missing android/keystore.properties for release signing. " +
            "Copy android-keystore.properties.example to android/keystore.properties " +
            "and set your Play upload keystore values."
        )
    }
}
// @generated end ${MARKER}
`;

const RELEASE_SIGNING_CONFIG = `
        release {
            if (releaseKeystorePropertiesFile.exists()) {
                storeFile file(releaseKeystoreProperties['storeFile'])
                storePassword releaseKeystoreProperties['storePassword']
                keyAlias releaseKeystoreProperties['keyAlias']
                keyPassword releaseKeystoreProperties['keyPassword']
            }
        }`;

const RELEASE_BUILD_TYPE_SIGNING = `
            if (releaseKeystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    let contents = config.modResults.contents;

    contents = contents.replace(/^android \{/m, `${KEYSTORE_LOADER}\nandroid {`);

    contents = contents.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n\s*\})/,
      `$1${RELEASE_SIGNING_CONFIG}\n`,
    );

    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s*=\s*signingConfigs\.debug/,
      `$1${RELEASE_BUILD_TYPE_SIGNING}`,
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
