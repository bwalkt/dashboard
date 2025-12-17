module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
  env: {
    test: {
      presets: [['module:@react-native/babel-preset', { modules: 'commonjs' }]],
    },
  },
}
