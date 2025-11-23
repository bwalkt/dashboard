import { configureApi } from '@pzero/shared/api'
import { colors } from '@pzero/shared/theme'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Alert, BackHandler, Platform, StatusBar } from 'react-native'
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'
import DeviceInfo from 'react-native-device-info'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Colors } from 'react-native-ui-lib'
import PinEntry from './src/components/PinEntry'
import SidebarMenu from './src/components/SidebarMenu'
import { envs } from './src/constants/envs'
import ConnectDeviceScreen from './src/screens/ConnectDeviceScreen'
import EndpointsScreen from './src/screens/EndpointsScreen'
import HomeScreen from './src/screens/HomeScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import SplashScreen from './src/screens/SplashScreen'
import { SettingsStore, settingsKeys } from './src/stores/settings'

// Configure API client for mobile environment
configureApi({
  getBackendUrl: () => envs.BASE_API_URL,
})

console.log('🚀 App.tsx loaded - React Native console.log works!')

const Stack = createNativeStackNavigator()
const Drawer = createDrawerNavigator()

/**
 * Root application component that initializes app state and renders the navigation flow.
 *
 * Automatically authenticates users with Face ID/Touch ID on real devices (skips on simulator).
 * After successful authentication, navigates to Settings if not verified, or Endpoints if verified.
 * Implements 3-attempt lockout for failed authentication attempts.
 *
 * @returns The root React element for the application UI.
 */
function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [showPinEntry, setShowPinEntry] = useState(false)

  const MAX_ATTEMPTS = 3

  useEffect(() => {
    // Initialize app and trigger authentication after splash
    const initializeApp = async () => {
      try {
        Colors.loadColors(colors)

        // Check if running on emulator
        const isEmulator = await DeviceInfo.isEmulator()

        // Show splash for 2 seconds
        setTimeout(async () => {
          setShowSplash(false)

          // Auto-trigger authentication after splash (skip on emulator)
          if (isEmulator) {
            console.log('Running on emulator - skipping authentication')
            setIsAuthenticated(true)
          } else {
            // Real device - trigger authentication
            await performAuthentication()
          }
        }, 2000)
      } catch (error) {
        console.error('App initialization error:', error)
        setShowSplash(false)
      }
    }
    initializeApp()
  }, [])

  const performAuthentication = async () => {
    if (isLocked) {
      Alert.alert('Account Locked', 'Too many failed authentication attempts. Please restart the app to try again.', [
        { text: 'Exit', onPress: () => BackHandler.exitApp() },
      ])
      return
    }

    try {
      const rnBiometrics = new ReactNativeBiometrics()
      const { available, biometryType } = await rnBiometrics.isSensorAvailable()

      if (available && biometryType) {
        // Biometrics available - use Face ID/Touch ID
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Authenticate to access the app',
          cancelButtonText: 'Cancel',
          fallbackPromptMessage: 'Use device passcode',
        })

        if (success) {
          setIsAuthenticated(true)
          setFailedAttempts(0)
        } else {
          handleAuthFailure()
        }
      } else {
        // No biometrics - fallback to PIN
        const savedPin = SettingsStore.getItem(settingsKeys.pin)
        if (savedPin) {
          // Show PIN entry
          setShowPinEntry(true)
        } else {
          // No PIN set up - show alert to set up PIN in settings
          Alert.alert('PIN Required', 'Please set up a PIN in the Settings screen for authentication.', [
            {
              text: 'Exit',
              onPress: () => BackHandler.exitApp(),
              style: 'cancel',
            },
            {
              text: 'Continue',
              onPress: () => {
                // Allow access to set up PIN
                setIsAuthenticated(true)
                setFailedAttempts(0)
              },
            },
          ])
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      handleAuthFailure()
    }
  }

  const handleAuthFailure = () => {
    const newAttempts = failedAttempts + 1
    setFailedAttempts(newAttempts)

    if (newAttempts >= MAX_ATTEMPTS) {
      setIsLocked(true)
      Alert.alert('Account Locked', 'Too many failed authentication attempts. Please restart the app to try again.', [
        { text: 'Exit', onPress: () => BackHandler.exitApp() },
      ])
    } else {
      const remainingAttempts = MAX_ATTEMPTS - newAttempts
      Alert.alert(
        'Authentication Failed',
        `You have ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
        [
          {
            text: 'Try Again',
            onPress: () => performAuthentication(),
          },
          {
            text: 'Exit',
            onPress: () => BackHandler.exitApp(),
            style: 'cancel',
          },
        ],
      )
    }
  }

  const handleSettingsComplete = () => {
    // Settings completed, can be used if needed
  }

  const handlePinEntered = async (enteredPin: string): Promise<boolean> => {
    const savedPin = SettingsStore.getItem(settingsKeys.pin)

    if (enteredPin === savedPin) {
      setShowPinEntry(false)
      setIsAuthenticated(true)
      setFailedAttempts(0)
      return true
    } else {
      handleAuthFailure()
      return false
    }
  }

  const handlePinCancel = () => {
    BackHandler.exitApp()
  }

  const DrawerNavigator = () => {
    // Check if user is verified to determine initial route
    const isVerified = SettingsStore.isVerified
    const initialRoute = isVerified ? 'Endpoints' : 'Settings'

    return (
      <Drawer.Navigator
        drawerContent={props => <SidebarMenu {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: colors.backgroundDarkColor || '#1a1a1a',
          },
        }}
        initialRouteName={initialRoute}
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="ConnectDevice" component={ConnectDeviceScreen} />
        <Drawer.Screen name="Endpoints" component={EndpointsScreen} />
        <Drawer.Screen name="Settings">
          {props => (
            <SettingsScreen {...props} navigation={props.navigation} onSettingsComplete={handleSettingsComplete} />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showSplash || !isAuthenticated ? (
            <>
              {showPinEntry ? (
                <Stack.Screen name="PinEntry">
                  {() => (
                    <PinEntry
                      onPinEntered={handlePinEntered}
                      onCancel={handlePinCancel}
                      title="Enter PIN"
                      subtitle="Enter your 6-digit PIN to access the app"
                    />
                  )}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="Splash">{() => <SplashScreen onFinish={() => {}} />}</Stack.Screen>
              )}
            </>
          ) : (
            <Stack.Screen name="Main" component={DrawerNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default App
