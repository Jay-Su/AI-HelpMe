const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro 资源打包配置
 * 特别支持：将 .gguf 大模型后缀加入资产打包扩展白名单
 */
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts } = defaultConfig.resolver;

const config = {
  resolver: {
    assetExts: [...assetExts, 'gguf'],
    sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
