const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, '../../node_modules/.pnpm'),
    ],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    unstable_enableSymlinks: true,
    // Shim Node.js modules that don't exist in React Native
    extraNodeModules: {
      crypto: path.resolve(__dirname, 'shims/crypto.js'),
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
