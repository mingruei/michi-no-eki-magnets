const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'android-release-signing-from-keystore-properties';

const RELEASE_SIGNING_SNIPPET = `
// @generated begin ${MARKER}
def japanCastlesKeystorePropertiesFile = rootProject.file("keystore.properties")
def japanCastlesKeystoreProperties = new Properties()
if (japanCastlesKeystorePropertiesFile.exists()) {
    japanCastlesKeystoreProperties.load(new FileInputStream(japanCastlesKeystorePropertiesFile))
}

def japanCastlesResolveStoreFile(Object rawPath) {
    if (rawPath == null) {
        return null
    }
    def path = rawPath.toString().trim()
    if (path.isEmpty()) {
        return null
    }
    if (path.startsWith("~/") || path == "~") {
        def home = System.getProperty("user.home")
        def relative = path == "~" ? "" : path.substring(2)
        return new File(home, relative)
    }
    def candidate = new File(path)
    if (candidate.isAbsolute()) {
        return candidate
    }
    // Relative paths resolve from the android/ project root
    return rootProject.file(path)
}

afterEvaluate {
    if (!japanCastlesKeystorePropertiesFile.exists()) {
        return
    }
    android.signingConfigs.release {
        def resolvedStoreFile = japanCastlesResolveStoreFile(japanCastlesKeystoreProperties["storeFile"])
        if (resolvedStoreFile == null || !resolvedStoreFile.exists()) {
            throw new GradleException(
                "Release keystore not found: \${japanCastlesKeystoreProperties['storeFile']} (resolved: \${resolvedStoreFile})"
            )
        }
        storeFile resolvedStoreFile
        storePassword japanCastlesKeystoreProperties["storePassword"]
        keyAlias japanCastlesKeystoreProperties["keyAlias"]
        keyPassword japanCastlesKeystoreProperties["keyPassword"]
    }
    android.buildTypes.release {
        signingConfig android.signingConfigs.release
    }
}
// @generated end ${MARKER}
`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    config.modResults.contents += `\n${RELEASE_SIGNING_SNIPPET}\n`;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
