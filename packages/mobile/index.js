import 'react-native-get-random-values'
import 'react-native-gesture-handler'
import { AppRegistry } from 'react-native'

require('react-native-ui-lib/config').setConfig({ appScheme: 'default' })

// Global promise rejection handler
const rejectionHandler = event => {
  console.warn('Unhandled promise rejection:', event.reason)
  // Don't crash the app on unhandled rejections in development
  if (__DEV__) {
    console.log('Promise rejection details:', event)
  }
}

if (global.PromiseRejectionEvent) {
  global.addEventListener('unhandledrejection', rejectionHandler)
}

import App from './App'
import { name as appName } from './app.json'

AppRegistry.registerComponent(appName, () => App)
