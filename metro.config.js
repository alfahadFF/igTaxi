const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// إعدادات Metro للموبايل فقط
config.resolver.platforms = ['ios', 'android', 'native'];

// إضافة Platform Extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'];

module.exports = config;
