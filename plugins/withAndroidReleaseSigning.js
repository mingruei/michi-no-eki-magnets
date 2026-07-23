const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'android-release-signing-from-keystore-properties';

/**
 * Loads android/keystore.properties for local release signing.
 * storeFile must be an absolute path (each machine keeps its own local file).
 */
const RELEASE_SIGNING_SNIPPET = `
// @generated begin ${MARKER}
def japanCastlesKeystorePropertiesFile = rootProject.file("keystore.properties")
def japanCastlesKeystoreProperties = new Properties()
if (japanCastlesKeystorePropertiesFile.exists()) {
    japanCastlesKeystorePropertiesFile.withInputStream { stream ->
        japanCastlesKeystoreProperties.load(stream)
    }
}

ext.japanCastlesApplyReleaseSigning = {
    if (!japanCastlesKeystorePropertiesFile.exists()) {
        return false
    }

    def rawPath = (japanCastlesKeystoreProperties["storeFile"] ?: "").toString().trim()
    if (rawPath.isEmpty()) {
        throw new GradleException("android/keystore.properties is missing storeFile")
    }
    if (rawPath.startsWith("~") || rawPath.contains("/~/")) {
        throw new GradleException(
            "storeFile must be an absolute path for this machine (do not use ~).\\n" +
            "Example: storeFile=/Users/you/upload-keystore.jks\\n" +
            "Got: \${rawPath}"
        )
    }

    def store = new File(rawPath)
    if (!store.isAbsolute()) {
        throw new GradleException(
            "storeFile must be an absolute path for this machine.\\n" +
            "Example: storeFile=/Users/you/upload-keystore.jks\\n" +
            "Got: \${rawPath}"
        )
    }
    if (!store.isFile()) {
        throw new GradleException("Release keystore not found: \${store.absolutePath}")
    }

    def releaseSigning = android.signingConfigs.findByName("release")
    if (releaseSigning == null) {
        releaseSigning = android.signingConfigs.create("release")
    }
    releaseSigning.storeFile = store
    releaseSigning.storePassword = japanCastlesKeystoreProperties["storePassword"]
    releaseSigning.keyAlias = japanCastlesKeystoreProperties["keyAlias"]
    releaseSigning.keyPassword = japanCastlesKeystoreProperties["keyPassword"]
    android.buildTypes.release.signingConfig = releaseSigning
    logger.lifecycle("Using release keystore: \${store.absolutePath}")
    return true
}

afterEvaluate {
    japanCastlesApplyReleaseSigning()
}
// @generated end ${MARKER}
`;

function stripGeneratedBlocks(contents) {
  return contents
    .replace(
      /\n?\/\/ @generated begin android-release-signing-from-keystore-properties[\s\S]*?\/\/ @generated end android-release-signing-from-keystore-properties\n?/g,
      '\n',
    )
    .replace(
      /\n?\/\/ @generated begin android-release-signing-hooks[\s\S]*?\/\/ @generated end android-release-signing-hooks\n?/g,
      '\n',
    )
    .replace(
      /\n?\s*\/\/ @generated begin japan-castles-release-signing-config[\s\S]*?\/\/ @generated end japan-castles-release-signing-config\n?/g,
      '\n',
    );
}

function preferReleaseSigningInBuildTypes(contents) {
  return contents.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    `$1signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug`,
  );
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = stripGeneratedBlocks(config.modResults.contents);
    contents = preferReleaseSigningInBuildTypes(contents);

    if (!contents.includes(MARKER)) {
      contents += `\n${RELEASE_SIGNING_SNIPPET}\n`;
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
