const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'release-artifact-file-name';

const RELEASE_FILE_NAME_SNIPPET = `
// @generated begin ${MARKER}
afterEvaluate {
    tasks.matching { it.name == "bundleRelease" }.configureEach { task ->
        task.doLast {
            def artifactBaseName =
                "japan-castles-map-\${android.defaultConfig.versionName}-\${android.defaultConfig.versionCode}"
            def outputDir = file("\${layout.buildDirectory.get()}/outputs/bundle/release")
            def bundleFile = outputDir.listFiles()?.find { it.name.endsWith(".aab") }
            if (bundleFile != null) {
                def targetFile = new File(outputDir, "\${artifactBaseName}.aab")
                if (targetFile.exists()) {
                    targetFile.delete()
                }
                if (!bundleFile.renameTo(targetFile)) {
                    bundleFile.withInputStream { input ->
                        targetFile.withOutputStream { output -> output << input }
                    }
                    bundleFile.delete()
                }
                logger.lifecycle("Release bundle: \${targetFile.name}")
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

            outputDir.listFiles()?.findAll { it.name.endsWith(".apk") }?.each { apkFile ->
                def targetFile = new File(outputDir, "\${artifactBaseName}.apk")
                if (targetFile.exists() && targetFile.absolutePath != apkFile.absolutePath) {
                    targetFile.delete()
                }
                if (apkFile.name != targetFile.name) {
                    if (!apkFile.renameTo(targetFile)) {
                        apkFile.withInputStream { input ->
                            targetFile.withOutputStream { output -> output << input }
                        }
                        apkFile.delete()
                    }
                    logger.lifecycle("Release apk: \${targetFile.name}")
                }
            }
        }
    }
}
// @generated end ${MARKER}
`;

function withAndroidReleaseFileName(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    config.modResults.contents += `\n${RELEASE_FILE_NAME_SNIPPET}\n`;
    return config;
  });
}

module.exports = withAndroidReleaseFileName;
