const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const fflateBrowserPath = path.resolve(__dirname, 'node_modules/fflate/lib/browser.cjs');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'fflate') {
    return {
      filePath: fflateBrowserPath,
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
