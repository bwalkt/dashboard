module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      {
        moduleName: '@env',
        path: '.env',
      },
    ],
    'react-native-reanimated/plugin',
  ],
}
