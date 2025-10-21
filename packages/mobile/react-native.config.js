const path = require('path')

module.exports = {
  dependencies: {
    'react-native-worklets-core': {
      root: path.join(__dirname, '..', '..', 'node_modules', 'react-native-worklets-core'),
      platforms: {
        ios: {},
      },
    },
  },
}
