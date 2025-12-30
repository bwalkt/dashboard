module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-svg|react-native-ui-lib|react-native-mmkv|react-native-device-info|react-native-biometrics|react-native-config|react-native-qrcode-svg|react-native-swipe-list-view|react-native-autocomplete-input|react-native-confirmation-code-field|react-native-geolocation-service|react-native-international-phone-number|react-native-network-info|react-native-simcard-info|react-native-splash-screen|react-native-vision-camera|react-native-worklets|react-native-ble-plx|react-native-tcp-socket|@react-native-community/netinfo|@pzero|uuid)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^@pzero/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.js',
  },
  resolver: '<rootDir>/jest.resolver.js',
  haste: {
    defaultPlatform: 'ios',
    platforms: ['ios', 'android', 'native'],
  },
}
