const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'release-artifact-file-name';

/**
 * Copy (do not rename/delete) the AGP output artifact to a friendlier name.
 * Renaming app-release.aab breaks later tasks such as
 * produceReleaseBundleIdeListingFile that still expect the original path.
 */
const RELEASE_FILE_NAME_SNIPPET = `
// @generated begin ${MARKER}
afterEvaluate {
    tasks.matching { it.name == "bundleRelease" }.configureEach { task ->
        task.doLast {
            def artifactBaseName =
                "japan-castles-map-\${android.defaultConfig.versionName}-\${android.defaultConfig.versionCode}"
            def outputDir = file("\${layout.buildDirectory.get()}/outputs/bundle/release")
            def bundleFile = outputDir.listFiles()?.find {
                it.name.endsWith(".aab") && it.name != "\${artifactBaseName}.aab"
            }
            if (bundleFile != null) {
                def targetFile = new File(outputDir, "\${artifactBaseName}.aab")
                if (targetFile.exists()) {
                    targetFile.delete()
                }
                bundleFile.withInputStream { input ->
                    targetFile.withOutputStream { output -> output << input }
                }
                logger.lifecycle("Release bundle copy: \${targetFile.name} (kept \${bundleFile.name})")
            }
        }
    }

    tasks.matching { it.name == "assembleRelease" }.configureEach { task ->
        task.doLast {
            def artifactBaseName =
                "japan-castles-map-\${android.defaultConfig.versionName}-\${android.defaultConfig.versionCode}"
            def outputDir = file("\${layout.buildDirectory.get()}/outputs/apk/release")
            if (!outputDir.exists()) {
                return
            }

            outputDir.listFiles()?.findAll {
                it.name.endsWith(".apk") && it.name != "\${artifactBaseName}.apk"
            }?.each { apkFile ->
                def targetFile = new File(outputDir, "\${artifactBaseName}.apk")
                if (targetFile.exists() && targetFile.absolutePath != apkFile.absolutePath) {
                    targetFile.delete()
                }
                if (apkFile.absolutePath != targetFile.absolutePath) {
                    apkFile.withInputStream { input ->
                        targetFile.withOutputStream { output -> output << input }
                    }
                    logger.lifecycle("Release apk copy: \${targetFile.name} (kept \${apkFile.name})")
                }
            }
        }
    }
}
// @generated end ${MARKER}
`;

function stripGeneratedBlock(contents) {
  return contents.replace(
    /\n?\/\/ @generated begin release-artifact-file-name[\s\S]*?\/\/ @generated end release-artifact-file-name\n?/g,
    '\n',
  );
}

function withAndroidReleaseFileName(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = stripGeneratedBlock(config.modResults.contents);
    contents += `\n${RELEASE_FILE_NAME_SNIPPET}\n`;
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseFileName;
