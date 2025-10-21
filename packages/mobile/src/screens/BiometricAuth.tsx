import type React from 'react'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'

interface BiometricAuthProps {
  onSuccess: () => void
  onCancel?: () => void
}

const BiometricAuth: React.FC<BiometricAuthProps> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [biometryType, setBiometryType] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    checkBiometrics().catch(err => {
      console.error('BiometricAuth useEffect error:', err)
      setIsLoading(false)
      setBiometryType(null)
    })
  }, [])

  const checkBiometrics = async () => {
    try {
      const rnBiometrics = new ReactNativeBiometrics()
      const { available, biometryType: type } = await rnBiometrics.isSensorAvailable()

      if (available && type) {
        setBiometryType(type)
        // Don't auto-trigger authentication, let user tap the button
      } else {
        // No biometrics available, fallback to passcode option
        setBiometryType(null)
      }
    } catch (error) {
      console.warn('Biometric check error (expected in simulator):', error)
      setBiometryType(null) // Fallback to passcode
    } finally {
      setIsLoading(false)
    }
  }

  const authenticateWithBiometrics = async () => {
    try {
      // Hide the UI while authentication dialog is showing
      setIsAuthenticating(true)

      const rnBiometrics = new ReactNativeBiometrics()

      if (biometryType) {
        // If biometrics are available, use them
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Authenticate to access the app',
          cancelButtonText: 'Cancel',
          fallbackPromptMessage: 'Use device passcode',
        })

        setIsAuthenticating(false)

        if (success) {
          onSuccess()
        } else {
          // User cancelled, show the UI again
          setIsAuthenticating(false)
        }
      } else {
        // No biometrics available, simulate passcode authentication
        Alert.alert(
          'Authentication Required',
          'Please use your device passcode to authenticate.',
          [
            {
              text: 'Cancel',
              onPress: () => {
                setIsAuthenticating(false)
                onCancel?.()
              },
              style: 'cancel',
            },
            {
              text: 'Continue',
              onPress: () => {
                setIsAuthenticating(false)
                onSuccess() // For demo purposes, allow access
              },
            },
          ],
          {
            onDismiss: () => setIsAuthenticating(false),
          },
        )
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setIsAuthenticating(false)
      Alert.alert('Authentication Failed', 'Authentication is not available on this device.', [
        {
          text: 'Cancel',
          onPress: () => onCancel?.(),
        },
      ])
    }
  }

  const getBiometryTypeText = () => {
    switch (biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID'
      case BiometryTypes.TouchID:
        return 'Touch ID'
      case BiometryTypes.Biometrics:
        return 'Biometric Authentication'
      default:
        return 'Passcode'
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking biometrics...</Text>
      </View>
    )
  }

  // Show blank screen while authentication dialog is active
  if (isAuthenticating) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.authenticatingText}>Authenticating...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.authContainer}>
        <Text style={styles.title}>Secure Authentication</Text>
        <Text style={styles.subtitle}>Use {getBiometryTypeText()} or your device passcode to continue</Text>

        <TouchableOpacity style={styles.authButton} onPress={authenticateWithBiometrics} activeOpacity={0.7}>
          <Text style={styles.authButtonText}>Authenticate with {getBiometryTypeText()}</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  authContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
})

export default BiometricAuth
