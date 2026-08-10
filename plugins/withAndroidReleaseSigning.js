const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'android-release-signing-from-keystore-properties';

/**
 * Loads android/keystore.properties for local release signing.
 * storeFile must be an absolute path (each machine keeps its own local file).
 */
const TOP_SNIPPET = `
// @generated begin ${MARKER}
def japanCastlesKeystorePropertiesFile = rootProject.file("keystore.properties")
def japanCastlesKeystoreProperties = new Properties()
if (japanCastlesKeystorePropertiesFile.exists()) {
    japanCastlesKeystorePropertiesFile.withInputStream { stream ->
        japanCastlesKeystoreProperties.load(stream)
    }
}

def japanCastlesResolveReleaseKeystoreFile = {
    if (!japanCastlesKeystorePropertiesFile.exists()) {
        return null
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

    return store
}
// @generated end ${MARKER}
`;

const RELEASE_SIGNING_CONFIG_BLOCK = `
        release {
            def japanCastlesStore = japanCastlesResolveReleaseKeystoreFile()
            if (japanCastlesStore != null) {
                storeFile japanCastlesStore
                storePassword japanCastlesKeystoreProperties["storePassword"]
                keyAlias japanCastlesKeystoreProperties["keyAlias"]
                keyPassword japanCastlesKeystoreProperties["keyPassword"]
            }
        }`;

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
    )
    .replace(
      /\n?\/\/ @generated begin release-signing-config[\s\S]*?\/\/ @generated end release-signing-config\n?/g,
      '\n',
    )
    .replace(
      /\n?\/\/ @generated begin release-signing-config-task-validation[\s\S]*?\/\/ @generated end release-signing-config-task-validation\n?/g,
      '\n',
    );
}

function preferReleaseSigningInBuildTypes(contents) {
  return contents.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    `$1signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug`,
  );
}

function injectTopSnippet(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }

  const androidIndex = contents.search(/\nandroid\s*\{/);
  if (androidIndex === -1) {
    return `${contents.trimEnd()}\n${TOP_SNIPPET}\n`;
  }

  return `${contents.slice(0, androidIndex)}\n${TOP_SNIPPET}${contents.slice(androidIndex)}`;
}

function injectReleaseSigningConfig(contents) {
  const signingConfigsStart = contents.search(/\bsigningConfigs\s*\{/);
  if (signingConfigsStart === -1) {
    return contents;
  }

  const buildTypesStart = contents.indexOf('buildTypes', signingConfigsStart);
  const signingConfigsEnd = buildTypesStart === -1 ? contents.length : buildTypesStart;
  const signingSection = contents.slice(signingConfigsStart, signingConfigsEnd);
  const rest = contents.slice(signingConfigsEnd);

  let updatedSection = signingSection;
  if (signingSection.includes('japanCastlesResolveReleaseKeystoreFile')) {
    updatedSection = signingSection.replace(
      /\s*release\s*\{[\s\S]*?japanCastlesResolveReleaseKeystoreFile[\s\S]*?\}\s*/,
      `\n${RELEASE_SIGNING_CONFIG_BLOCK}\n`,
    );
  } else if (/\brelease\s*\{/.test(signingSection)) {
    updatedSection = signingSection.replace(
      /\s*release\s*\{[^}]*\}\s*/,
      `\n${RELEASE_SIGNING_CONFIG_BLOCK}\n`,
    );
  } else {
    updatedSection = signingSection.replace(
      /(debug\s*\{[\s\S]*?\}\s*)/,
      `$1${RELEASE_SIGNING_CONFIG_BLOCK}\n`,
    );
  }

  return contents.slice(0, signingConfigsStart) + updatedSection + rest;
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = stripGeneratedBlocks(config.modResults.contents);
    contents = preferReleaseSigningInBuildTypes(contents);
    contents = injectTopSnippet(contents);
    contents = injectReleaseSigningConfig(contents);

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
