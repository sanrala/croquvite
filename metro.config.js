const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Nécessaire pour que Firebase (connexion) fonctionne avec Expo SDK 53.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
