import { api } from '@pzero/shared/api'
import { colors } from '@pzero/shared/theme'
import type { NavigationProp } from '@react-navigation/native'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from 'react-native-confirmation-code-field'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View } from 'react-native-ui-lib'
import Button from '../components/Button'
import Header from '../components/Header'
import { labels } from '../constants/labels'
import { SettingsStore, settingsKeys } from '../stores/settings'

const CELL_COUNT = 6

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
  PhoneVerification: { phoneNumber: string }
}

interface PhoneVerificationScreenProps {
  navigation?: NavigationProp<DrawerParamList>
  route?: {
    params: {
      phoneNumber: string
    }
  }
}

const PhoneVerificationScreen: React.FC<PhoneVerificationScreenProps> = ({ navigation, route }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const phoneNumber = route?.params?.phoneNumber || ''
  const ref = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT })
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  })

  useEffect(() => {
    if (code.length === CELL_COUNT) {
      handleVerifyCode()
    }
  }, [code])

  const handleVerifyCode = async () => {
    if (isLoading) {
      return
    }

    if (code.length !== CELL_COUNT) {
      Alert.alert(labels.error, 'Please enter the complete verification code')
      return
    }

    if (!phoneNumber) {
      Alert.alert(labels.error, 'Missing phone number for verification.')
      return
    }

    setIsLoading(true)
    try {
      // Call the backend SMS verification endpoint
      await api.post('/sms/verify/confirm', {
        phone: phoneNumber,
        code: code,
      })

      // Save the verified phone number to settings
      SettingsStore.setItem({
        key: settingsKeys.phone,
        data: phoneNumber,
      })
      SettingsStore.setItem({
        key: settingsKeys.phoneVerified,
        data: true,
      })

      Alert.alert(labels.success, 'Phone number verified successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation) {
              navigation.navigate('Settings')
            }
          },
        },
      ])
    } catch (error: any) {
      console.error('Verification error:', error)
      const errorMessage = error?.message || 'Invalid or expired verification code. Please try again.'
      Alert.alert(labels.error, errorMessage)
      setCode('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!phoneNumber) {
      Alert.alert(labels.error, 'Missing phone number for resending code.')
      return
    }

    setIsResending(true)
    try {
      // Call the backend to resend the SMS code
      await api.post('/sms/verify/resend', {
        phone: phoneNumber,
      })

      setCode('')
      Alert.alert(labels.success, 'New verification code sent to your phone')
    } catch (error: any) {
      console.error('Resend error:', error)
      const errorMessage = error?.message || 'Failed to resend code. Please try again.'
      Alert.alert(labels.error, errorMessage)
    } finally {
      setIsResending(false)
    }
  }

  const handleCancel = () => {
    if (navigation) {
      navigation.goBack()
    }
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <Header title="Verify Phone Number" navigation={navigation} />

      <View style={styles.content}>
        <Text text60 color={colors.textLightColor} marginB-20 center>
          Enter Verification Code
        </Text>

        <Text text70 color={colors.textDarkColor} marginB-30 center>
          We've sent a 6-digit code to {phoneNumber}
        </Text>

        <View marginB-40>
          <CodeField
            ref={ref}
            {...props}
            value={code}
            onChangeText={setCode}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                style={[styles.cell, isFocused && styles.focusCell]}
                onLayout={getCellOnLayoutHandler(index)}
              >
                <Text style={styles.cellText}>{symbol || (isFocused ? <Cursor /> : null)}</Text>
              </View>
            )}
          />
        </View>

        <Button
          label="Verify Code"
          onPress={handleVerifyCode}
          disabled={isLoading || code.length !== CELL_COUNT}
          loading={isLoading}
          variant="primary"
          size="medium"
          style={styles.button}
        />

        <Button
          label="Resend Code"
          onPress={handleResendCode}
          disabled={isResending || isLoading}
          loading={isResending}
          variant="secondary"
          size="medium"
          style={styles.button}
        />

        <Button
          label="Cancel"
          onPress={handleCancel}
          disabled={isLoading || isResending}
          variant="ghost"
          size="medium"
          style={styles.button}
        />

        <Text text80 color={colors.textDarkColor} marginT-20 center>
          Didn't receive the code? Check your phone and try resending.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  codeFieldRoot: {
    marginTop: 20,
    marginBottom: 20,
    justifyContent: 'center',
  },
  cell: {
    width: 50,
    height: 60,
    lineHeight: 58,
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  focusCell: {
    borderColor: colors.primaryColor || '#007AFF',
  },
  cellText: {
    fontSize: 24,
    color: colors.textLightColor || '#ffffff',
    textAlign: 'center',
  },
  button: {
    marginTop: 15,
  },
})

export default PhoneVerificationScreen
