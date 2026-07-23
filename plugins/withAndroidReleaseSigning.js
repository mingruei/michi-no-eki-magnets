const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'android-release-signing-from-keystore-properties';
const DEFAULT_HOME_KEYSTORE_NAME = 'upload-keystore.jks';

/**
 * Release signing for local Play uploads.
 *
 * IMPORTANT: Never pass "~/…" through Gradle's file()/storeFile DSL — it becomes
 * android/app/~/… . Always build an absolute java.io.File under user.home first,
 * then assign signingConfig.storeFile = that File.
 */
const RELEASE_SIGNING_HELPERS = `
// @generated begin ${MARKER}
def japanCastlesKeystorePropertiesFile = rootProject.file("keystore.properties")
def japanCastlesKeystoreProperties = new Properties()
if (japanCastlesKeystorePropertiesFile.exists()) {
    japanCastlesKeystorePropertiesFile.withInputStream { stream ->
        japanCastlesKeystoreProperties.load(stream)
    }
}

ext.japanCastlesHomeKeystore = {
    def home = System.getProperty("user.home") ?: System.getenv("HOME")
    if (home == null || home.toString().trim().isEmpty()) {
        throw new GradleException("user.home / HOME is unset; cannot resolve release keystore")
    }
    return new File(home.toString(), "${DEFAULT_HOME_KEYSTORE_NAME}")
}

ext.japanCastlesResolveStoreFile = { Object rawPath ->
    def homeFile = japanCastlesHomeKeystore()

    if (rawPath == null) {
        return homeFile
    }

    def path = rawPath.toString().trim()
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
        path = path.substring(1, path.length() - 1).trim()
    }
    if (path.isEmpty()) {
        return homeFile
    }

    // Already-corrupted Gradle path: .../android/app/~/upload-keystore.jks
    def corrupted = path.indexOf("/~/")
    if (corrupted >= 0) {
        def after = path.substring(corrupted + 3) // strip leading "/~/"
        def home = System.getProperty("user.home") ?: System.getenv("HOME")
        return new File(home.toString(), after)
    }

    if (path == "~" || path.startsWith("~/")) {
        def home = System.getProperty("user.home") ?: System.getenv("HOME")
        def relative = path == "~" ? "${DEFAULT_HOME_KEYSTORE_NAME}" : path.substring(2)
        if (relative.isEmpty()) {
            relative = "${DEFAULT_HOME_KEYSTORE_NAME}"
        }
        return new File(home.toString(), relative)
    }

    // Bare filename => home directory (avoids android/app relative resolution)
    if (!path.contains("/") && !path.contains("\\\\")) {
        def home = System.getProperty("user.home") ?: System.getenv("HOME")
        return new File(home.toString(), path)
    }

    def candidate = new File(path)
    if (candidate.isAbsolute()) {
        return candidate
    }

    // Relative non-bare paths: resolve from android/ (project root for this module)
    return rootProject.file(path)
}

ext.japanCastlesApplyReleaseSigning = {
    if (!japanCastlesKeystorePropertiesFile.exists()) {
        logger.lifecycle("android/keystore.properties not found; leave release signing unchanged")
        return false
    }

    def resolvedStoreFile = japanCastlesResolveStoreFile(japanCastlesKeystoreProperties["storeFile"])
    if (resolvedStoreFile == null || !resolvedStoreFile.isFile()) {
        throw new GradleException(
            "Release keystore not found.\\n" +
            "  keystore.properties storeFile=\${japanCastlesKeystoreProperties['storeFile']}\\n" +
            "  resolved=\${resolvedStoreFile?.absolutePath}\\n" +
            "Run: ./scripts/setup-android-release-keystore.sh"
        )
    }

    // Guard: never allow a literal ~/ segment into the signing config.
    if (resolvedStoreFile.absolutePath.contains("/~/")) {
        resolvedStoreFile = japanCastlesHomeKeystore()
    }

    def releaseSigning = android.signingConfigs.findByName("release")
    if (releaseSigning == null) {
        releaseSigning = android.signingConfigs.create("release")
    }

    // Assign the File property directly — do not call storeFile(file(...)).
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
    if (task.name.toLowerCase().contains("sign") || task.name == "packageRelease" || task.name == "bundleRelease" || task.name == "validateSigningRelease") {
        task.doFirst {
            japanCastlesApplyReleaseSigning()
        }
    }
}
// @generated end android-release-signing-hooks
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
  const applyPluginPattern = /((?:apply plugin:.*\n)+)/;
  if (applyPluginPattern.test(contents)) {
    return contents.replace(applyPluginPattern, `$1\n${RELEASE_SIGNING_HELPERS}\n`);
  }
  return `${RELEASE_SIGNING_HELPERS}\n${contents}`;
}

/**
 * Remove any existing signingConfigs.release { ... } so hand-edited
 * storeFile file('~/…') cannot win, then create ours via afterEvaluate only.
 */
function stripExistingReleaseSigningConfig(contents) {
  return contents.replace(
    /(signingConfigs\s*\{)([\s\S]*?)(\n\s*\}\s*\n\s*buildTypes)/,
    (full, start, inner, end) => {
      const withoutRelease = inner.replace(/\n[ \t]*release\s*\{[\s\S]*?\n[ \t]*\}/g, '\n');
      return `${start}${withoutRelease}${end}`;
    },
  );
}

function rewriteDangerousStoreFileCalls(contents) {
  return contents
    .replace(
      /storeFile\s+file\(\s*keystoreProperties\[['\"]storeFile['\"]\]\s*\)/g,
      '/* rewritten */ storeFile = japanCastlesResolveStoreFile(keystoreProperties[\'storeFile\'])',
    )
    .replace(
      /storeFile\s+file\(\s*['"]~\/[^'"]+['"]\s*\)/g,
      '/* rewritten */ storeFile = japanCastlesHomeKeystore()',
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
    contents = rewriteDangerousStoreFileCalls(contents);
    contents = stripExistingReleaseSigningConfig(contents);
    contents = injectHelpersNearTop(contents);
    contents = preferReleaseSigningInBuildTypes(contents);
    contents += `\n${RELEASE_SIGNING_HOOKS}\n`;

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
