import { colors } from '@pzero/shared/theme'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { BackHandler, StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Colors } from 'react-native-ui-lib'
import SidebarMenu from './src/components/SidebarMenu'
import BiometricAuth from './src/screens/BiometricAuth'
import ConnectDeviceScreen from './src/screens/ConnectDeviceScreen'
import EndpointsScreen from './src/screens/EndpointsScreen'
import HomeScreen from './src/screens/HomeScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import SplashScreen from './src/screens/SplashScreen'
import { SettingsStore } from './src/stores/settings'

console.log('🚀 App.tsx loaded - React Native console.log works!')

const Stack = createNativeStackNavigator()
const Drawer = createDrawerNavigator()

/**
 * Root application component that initializes app state and renders the navigation flow.
 *
 * Renders a splash screen on startup, then conditionally presents biometric authentication or the main drawer navigator.
 * If required device fields are missing, the settings screen is opened first; successful settings completion and authentication
 * transition the app into the main drawer-based UI.
 *
 * @returns The root React element for the application UI.
 */
function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsSettings, setNeedsSettings] = useState(false)

  const handleSplashFinish = () => {
    setShowSplash(false)
  }

  const checkRequiredFields = async () => {
    try {
      const nickName = SettingsStore.getItem('nickName')
      const email = SettingsStore.getItem('email')
      const phoneNumber = SettingsStore.getItem('phoneNumber')
      const classificationType = SettingsStore.getItem('classificationType')

      const hasRequiredFields = !!(nickName && email && phoneNumber && classificationType)
      setNeedsSettings(!hasRequiredFields)
    } catch (error) {
      console.error('Error checking required fields:', error)
      setNeedsSettings(true)
    }
  }

  useEffect(() => {
    // Simulate initialization tasks like loading resources or checking auth status
    const initializeApp = async () => {
      try {
        Colors.loadColors(colors)
        await checkRequiredFields()
        // Perform any async tasks here
        setTimeout(() => {
          setShowSplash(false)
        }, 2000) // Show splash for 2 seconds
      } catch (error) {
        console.error('App initialization error:', error)
        // Still show the app even if initialization fails
        setShowSplash(false)
      }
    }
    initializeApp()
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleAuthCancel = () => {
    // Exit the app when cancel is pressed
    BackHandler.exitApp()
  }

  const handleSettingsComplete = () => {
    setNeedsSettings(false)
  }

  const DrawerNavigator = () => (
    <Drawer.Navigator
      drawerContent={props => <SidebarMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.backgroundDarkColor || '#1a1a1a',
        },
      }}
      initialRouteName={needsSettings ? 'Settings' : 'Home'}
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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showSplash ? (
            <Stack.Screen name="Splash">{() => <SplashScreen onFinish={handleSplashFinish} />}</Stack.Screen>
          ) : !isAuthenticated ? (
            <Stack.Screen name="BiometricAuth">
              {() => <BiometricAuth onSuccess={handleAuthSuccess} onCancel={handleAuthCancel} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main" component={DrawerNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default App
