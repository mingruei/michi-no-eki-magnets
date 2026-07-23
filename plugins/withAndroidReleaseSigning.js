const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'android-release-signing-from-keystore-properties';

const RELEASE_SIGNING_HELPERS = `
// @generated begin ${MARKER}
def japanCastlesKeystorePropertiesFile = rootProject.file("keystore.properties")
def japanCastlesKeystoreProperties = new Properties()
if (japanCastlesKeystorePropertiesFile.exists()) {
    japanCastlesKeystorePropertiesFile.withInputStream { stream ->
        japanCastlesKeystoreProperties.load(stream)
    }
}

ext.japanCastlesResolveStoreFile = { Object rawPath ->
    if (rawPath == null) {
        return null
    }
    def path = rawPath.toString().trim()
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
        path = path.substring(1, path.length() - 1).trim()
    }
    if (path.isEmpty()) {
        return null
    }

    // Gradle file('~/…') resolves under android/app/ and produces
    // …/android/app/~/upload-keystore.jks. Expand before that happens.
    if (path.startsWith("~")) {
        def home = System.getProperty("user.home") ?: System.getenv("HOME")
        if (home == null || home.toString().trim().isEmpty()) {
            throw new GradleException("Cannot resolve keystore path '\${path}': user.home / HOME is unset")
        }
        def relative = path.replaceFirst(/^~\\/?/, "")
        return new File(home.toString(), relative)
    }

    def candidate = new File(path)
    if (candidate.isAbsolute()) {
        return candidate
    }
    return rootProject.file(path)
}

ext.japanCastlesApplyReleaseSigning = {
    if (!japanCastlesKeystorePropertiesFile.exists()) {
        return false
    }

    def resolvedStoreFile = japanCastlesResolveStoreFile(japanCastlesKeystoreProperties["storeFile"])
    if (resolvedStoreFile == null) {
        throw new GradleException(
            "android/keystore.properties is missing storeFile (expected e.g. ~/upload-keystore.jks)"
        )
    }
    if (!resolvedStoreFile.isFile()) {
        throw new GradleException(
            "Release keystore not found: \${japanCastlesKeystoreProperties['storeFile']} (resolved: \${resolvedStoreFile.absolutePath})"
        )
    }

    def releaseSigning = android.signingConfigs.findByName("release")
    if (releaseSigning == null) {
        releaseSigning = android.signingConfigs.create("release")
    }
    releaseSigning.storeFile = resolvedStoreFile
    releaseSigning.storePassword = japanCastlesKeystoreProperties["storePassword"]
    releaseSigning.keyAlias = japanCastlesKeystoreProperties["keyAlias"]
    releaseSigning.keyPassword = japanCastlesKeystoreProperties["keyPassword"]
    android.buildTypes.release.signingConfig = releaseSigning
    logger.lifecycle("Using release keystore: \${resolvedStoreFile.absolutePath}")
    return true
}
// @generated end ${MARKER}
`;

const RELEASE_SIGNING_HOOKS = `
// @generated begin android-release-signing-hooks
afterEvaluate {
    japanCastlesApplyReleaseSigning()
}

tasks.configureEach { task ->
    if (task.name == "validateSigningRelease" || task.name == "packageRelease" || task.name == "bundleRelease") {
        task.doFirst {
            japanCastlesApplyReleaseSigning()
        }
    }
}
// @generated end android-release-signing-hooks
`;

const INLINE_RELEASE_SIGNING_CONFIG = `
        // @generated begin japan-castles-release-signing-config
        release {
            if (japanCastlesKeystorePropertiesFile.exists()) {
                def _jcStoreFile = japanCastlesResolveStoreFile(japanCastlesKeystoreProperties["storeFile"])
                if (_jcStoreFile != null) {
                    storeFile _jcStoreFile
                    storePassword japanCastlesKeystoreProperties["storePassword"]
                    keyAlias japanCastlesKeystoreProperties["keyAlias"]
                    keyPassword japanCastlesKeystoreProperties["keyPassword"]
                }
            }
        }
        // @generated end japan-castles-release-signing-config
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

function injectHelpersNearTop(contents) {
  // Place helpers after plugin applies so rootProject / ext are available,
  // but before the android { } block evaluates storeFile.
  const applyPluginPattern = /((?:apply plugin:.*\n)+)/;
  if (applyPluginPattern.test(contents)) {
    return contents.replace(applyPluginPattern, `$1\n${RELEASE_SIGNING_HELPERS}\n`);
  }
  return `${RELEASE_SIGNING_HELPERS}\n${contents}`;
}

function injectInlineReleaseSigningConfig(contents) {
  const debugBlockPattern =
    /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?storeFile file\('debug\.keystore'\)[\s\S]*?\n\s*\})/;

  if (debugBlockPattern.test(contents)) {
    return contents.replace(debugBlockPattern, `$1${INLINE_RELEASE_SIGNING_CONFIG}`);
  }

  return contents;
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

    contents = contents.replace(
      /storeFile\s+file\(\s*keystoreProperties\[['\"]storeFile['\"]\]\s*\)/g,
      'storeFile japanCastlesResolveStoreFile(keystoreProperties[\'storeFile\'])',
    );

    contents = injectHelpersNearTop(contents);
    contents = injectInlineReleaseSigningConfig(contents);
    contents = preferReleaseSigningInBuildTypes(contents);
    contents += `\n${RELEASE_SIGNING_HOOKS}\n`;

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
