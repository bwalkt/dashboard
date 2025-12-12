// Setup React Native environment
global.__DEV__ = true

// Mock uuid module
jest.mock('uuid', () => ({
  v7: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
}))

// Mock React Native
jest.mock('react-native', () => {
  const React = require('react')
  return {
    Platform: {
      OS: 'ios',
      Version: 123,
      isTesting: true,
      select: jest.fn(obj => obj.ios),
    },
    NativeModules: {
      SettingsManager: {
        settings: {},
      },
      DeviceInfo: {
        Dimensions: {
          window: {
            fontScale: 1,
            height: 667,
            scale: 2,
            width: 375,
          },
        },
      },
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
    Alert: {
      alert: jest.fn(),
    },
    BackHandler: {
      exitApp: jest.fn(),
    },
    StatusBar: {
      setBarStyle: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(style => style),
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    View: React.forwardRef((props, ref) => React.createElement('View', { ...props, ref })),
    Text: React.forwardRef((props, ref) => React.createElement('Text', { ...props, ref })),
    TouchableOpacity: React.forwardRef((props, ref) => React.createElement('TouchableOpacity', { ...props, ref })),
    ScrollView: React.forwardRef((props, ref) => React.createElement('ScrollView', { ...props, ref })),
    Modal: React.forwardRef((props, ref) => React.createElement('Modal', { ...props, ref })),
    ActivityIndicator: React.forwardRef((props, ref) => React.createElement('ActivityIndicator', { ...props, ref })),
    TextInput: React.forwardRef((props, ref) => React.createElement('TextInput', { ...props, ref })),
    Image: React.forwardRef((props, ref) => React.createElement('Image', { ...props, ref })),
    FlatList: React.forwardRef((props, ref) => React.createElement('FlatList', { ...props, ref })),
    SafeAreaView: React.forwardRef((props, ref) => React.createElement('SafeAreaView', { ...props, ref })),
    Animated: {
      View: React.forwardRef((props, ref) => React.createElement('Animated.View', { ...props, ref })),
      Text: React.forwardRef((props, ref) => React.createElement('Animated.Text', { ...props, ref })),
      Value: jest.fn(() => ({ setValue: jest.fn() })),
      timing: jest.fn(() => ({ start: jest.fn() })),
    },
  }
})

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react').forwardRef((props, ref) => require('react').createElement('View', { ...props, ref }))
  return {
    State: {},
    PanGestureHandler: View,
    BaseButton: View,
    Directions: {},
    GestureHandlerRootView: View,
  }
})

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => {}
  return Reanimated
})

// Animated module mocking is handled internally by React Native

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
    contains: jest.fn(() => false),
  })),
}))

jest.mock('react-native-device-info', () => ({
  getDeviceId: jest.fn(() => 'test-device-id'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '14.0'),
  getModel: jest.fn(() => 'iPhone'),
  getBrand: jest.fn(() => 'Apple'),
  getApplicationName: jest.fn(() => 'TestApp'),
  getBundleId: jest.fn(() => 'com.test.app'),
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  isTablet: jest.fn(() => false),
}))

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: {
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'FaceID' })),
    createKeys: jest.fn(() => Promise.resolve({ publicKey: 'test-public-key' })),
    createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'test-signature' })),
    simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
    deleteKeys: jest.fn(() => Promise.resolve({ keysDeleted: true })),
  },
}))

jest.mock('react-native-config', () => ({
  API_URL: 'http://test.api.com',
  ENV: 'test',
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    }),
  ),
}))

jest.mock('react-native-splash-screen', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}))

jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraPermissionStatus: jest.fn(() => 'authorized'),
    requestCameraPermission: jest.fn(() => 'authorized'),
  },
  useCameraDevices: jest.fn(() => ({
    back: { id: 'back-camera' },
    front: { id: 'front-camera' },
  })),
}))

jest.mock('react-native-qrcode-svg', () => 'QRCode')

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
  G: 'G',
}))

global.__reanimatedWorkletInit = jest.fn()

jest.mock('./src/constants/envs', () => ({
  envs: {
    BASE_API_URL: 'http://test.api.com',
  },
}))

jest.mock('./src/stores/settings', () => ({
  SettingsStore: {
    getItem: jest.fn(),
    isVerified: false,
  },
  settingsKeys: {
    pin: 'pin',
  },
  classificationTypes: {
    general: 'general',
    medical: 'medical',
    financial: 'financial',
    legal: 'legal',
  },
  userSettingsSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string' },
      classification: { type: 'string' },
    },
    required: ['name', 'phone', 'email', 'classification'],
  },
}))

jest.mock('@pzero/shared/api', () => ({
  configureApi: jest.fn(),
}))

jest.mock('@pzero/shared/theme', () => ({
  colors: {
    backgroundColor: '#000000',
  },
}))

jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  return {
    SafeAreaProvider: ({ children }) => React.createElement('SafeAreaProvider', null, children),
    SafeAreaView: ({ children }) => React.createElement('SafeAreaView', null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

jest.mock('@react-navigation/native', () => {
  const React = require('react')
  return {
    NavigationContainer: ({ children }) => React.createElement('NavigationContainer', null, children),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  }
})

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react')
  return {
    createNativeStackNavigator: () => ({
      Navigator: React.forwardRef((props, ref) => React.createElement('Navigator', { ...props, ref }, props.children)),
      Screen: React.forwardRef(() => null),
    }),
  }
})

jest.mock('@react-navigation/drawer', () => {
  const React = require('react')
  return {
    createDrawerNavigator: () => ({
      Navigator: React.forwardRef((props, ref) => React.createElement('Navigator', { ...props, ref }, props.children)),
      Screen: React.forwardRef(() => null),
    }),
  }
})

jest.mock('react-native-ui-lib', () => {
  const React = require('react')
  return {
    Colors: {
      loadColors: jest.fn(),
    },
    View: React.forwardRef((props, ref) => React.createElement('View', { ...props, ref })),
    Text: React.forwardRef((props, ref) => React.createElement('Text', { ...props, ref })),
    TextField: React.forwardRef((props, ref) => React.createElement('TextField', { ...props, ref })),
    Button: React.forwardRef((props, ref) => React.createElement('Button', { ...props, ref })),
    Switch: React.forwardRef((props, ref) => React.createElement('Switch', { ...props, ref })),
  }
})

jest.mock('react-native-swipe-list-view', () => {
  const React = require('react')
  return {
    SwipeListView: React.forwardRef((props, ref) => React.createElement('SwipeListView', { ...props, ref })),
    SwipeRow: React.forwardRef((props, ref) => React.createElement('SwipeRow', { ...props, ref })),
  }
})

jest.mock('react-native-confirmation-code-field', () => {
  const React = require('react')
  return {
    CodeField: React.forwardRef((props, ref) => React.createElement('CodeField', { ...props, ref })),
    Cursor: React.forwardRef((props, ref) => React.createElement('Cursor', { ...props, ref })),
    useBlurOnFulfill: jest.fn(() => ({})),
    useClearByFocusCell: jest.fn(() => [[], jest.fn()]),
  }
})

jest.mock('react-native-international-phone-number', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => React.createElement('PhoneInput', { ...props, ref })),
  }
})
