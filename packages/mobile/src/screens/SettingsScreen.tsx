import { api } from '@pzero/shared/api'
import { DEFAULT_COUNTRY, getAllowedCountryCodes } from '@pzero/shared/phone'
import { colors } from '@pzero/shared/theme'
import { isBusinessEmail } from '@pzero/shared/validator'
import type { NavigationProp } from '@react-navigation/native'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from 'react-native-confirmation-code-field'
import PhoneInput from 'react-native-international-phone-number'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Switch, Text, TextField, View } from 'react-native-ui-lib'
import Button from '../components/Button'
import DrawerOverlay from '../components/DrawerOverlay'
import Header from '../components/Header'
import { labels } from '../constants/labels'
import { fetchTermsAndConditions, type TermsSection } from '../services/terms'
import { stores } from '../stores'
import {
  type ClassificationType,
  classificationTypes,
  SettingsStore,
  settingsKeys,
  userSettingsSchema,
} from '../stores/settings'

const CELL_COUNT = 6

const ajv = new Ajv()
addFormats(ajv)

const classificationOptions = Object.values(classificationTypes).map((type: string) => ({
  label: type.charAt(0).toUpperCase() + type.slice(1),
  value: type,
}))

const validate = ajv.compile(userSettingsSchema)

interface FormData {
  nickName: string
  email: string
  phoneNumber: string
  classificationType: ClassificationType
  isPrimary: boolean
  termsAccepted: boolean
}

interface FormErrors {
  nickName?: string
  email?: string
  phoneNumber?: string
  classificationType?: string
}

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
  PhoneVerification: { phoneNumber: string }
}

interface SettingsScreenProps {
  navigation?: NavigationProp<DrawerParamList>
  onSettingsComplete?: () => void
  onFAQPress?: () => void
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, onSettingsComplete, onFAQPress }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const [formData, setFormData] = useState<FormData>({
    nickName: '',
    email: '',
    phoneNumber: '',
    classificationType: '' as ClassificationType,
    isPrimary: false,
    termsAccepted: false,
  })
  const [previousData, setPreviousData] = useState<FormData>(formData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  // Phone verification state
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [showVerificationCode, setShowVerificationCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [verificationAttempts, setVerificationAttempts] = useState(0)
  const [isVerificationLocked, setIsVerificationLocked] = useState(false)

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [showEmailVerificationCode, setShowEmailVerificationCode] = useState(false)
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [isVerifyingEmailCode, setIsVerifyingEmailCode] = useState(false)
  const [emailVerificationAttempts, setEmailVerificationAttempts] = useState(0)
  const [isEmailVerificationLocked, setIsEmailVerificationLocked] = useState(false)

  // Popover state
  const [showPrimaryHint, setShowPrimaryHint] = useState(false)

  // Terms and conditions state
  const [showTermsDrawer, setShowTermsDrawer] = useState(false)
  const [termsData, setTermsData] = useState<TermsSection[]>([])
  const [isLoadingTerms, setIsLoadingTerms] = useState(false)

  const { DevicesStore } = stores
  // Use reactive Zustand store

  const MAX_VERIFICATION_ATTEMPTS = 3

  const codeFieldRef = useBlurOnFulfill({ value: verificationCode, cellCount: CELL_COUNT })
  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value: verificationCode,
    setValue: setVerificationCode,
  })

  const emailCodeFieldRef = useBlurOnFulfill({ value: emailVerificationCode, cellCount: CELL_COUNT })
  const [emailCodeFieldProps, getEmailCellOnLayoutHandler] = useClearByFocusCell({
    value: emailVerificationCode,
    setValue: setEmailVerificationCode,
  })

  useEffect(() => {
    loadCurrentSettings()
    const intervalId = setInterval(() => {
      // check if dirty
    }, 5000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (verificationCode.length === CELL_COUNT) {
      handleVerifyCode()
    }
  }, [verificationCode])

  useEffect(() => {
    if (emailVerificationCode.length === CELL_COUNT) {
      handleVerifyEmailCode()
    }
  }, [emailVerificationCode])

  const handleResetSettings = () => {
    setFormData(previousData)
    setErrors({})
  }

  const loadCurrentSettings = async () => {
    try {
      const nickName = SettingsStore.getItem(settingsKeys.nickName) || ''
      const email = SettingsStore.getItem(settingsKeys.email) || ''
      const phoneNumber = SettingsStore.getItem(settingsKeys.phone) || ''
      let classificationType = SettingsStore.getItem(settingsKeys.classificationType) || ''
      const isPrimary = SettingsStore.getItem(settingsKeys.isPrimary) || false
      const phoneVerified = SettingsStore.getItem(settingsKeys.phoneVerified) || false
      const emailVerified = SettingsStore.getItem(settingsKeys.emailVerified) || false
      const termsAccepted = SettingsStore.getItem(settingsKeys.termsAccepted) || false
      // Auto-set classification based on email if classification is empty or unknown
      if (email && (!classificationType || classificationType === 'unknown')) {
        const isBusiness = isBusinessEmail(email)
        classificationType = isBusiness ? 'corp' : 'personal'
      }
      setPreviousData({ nickName, email, phoneNumber, classificationType, isPrimary, termsAccepted })
      setFormData({
        nickName,
        email,
        phoneNumber,
        classificationType: (classificationType || 'unknown') as ClassificationType,
        isPrimary: isPrimary as boolean,
        termsAccepted: termsAccepted as boolean,
      })
      setIsPhoneVerified(phoneVerified as boolean)
      setIsEmailVerified(emailVerified as boolean)
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const getFieldErrors = (field: string): string[] => {
    if (!validate.errors) return []
    return validate.errors
      .filter(
        error =>
          error.instancePath === `/${field}` || (error.instancePath === '' && error.params?.missingProperty === field),
      )
      .map(error => {
        switch (error.keyword) {
          case 'required':
            return labels.fieldRequired(field)
          case 'minLength':
            return labels.fieldCannotBeEmpty(field)
          case 'format':
            if (error.params?.format === 'email') {
              return labels.invalidEmailFormat
            }
            return labels.invalidFieldFormat(field)
          case 'pattern':
            if (field === 'phoneNumber') {
              return labels.invalidPhoneFormat
            }
            return labels.invalidFieldFormat(field)
          case 'enum':
            return labels.selectValidField(field)
          default:
            return labels.invalidField(field)
        }
      })
  }

  const validateForm = (): boolean => {
    const isValid = validate(formData)
    const newErrors: FormErrors = {}

    // Custom validation for classification type
    if (!formData.classificationType || formData.classificationType === ('' as ClassificationType)) {
      newErrors.classificationType = labels.pleaseSelectClassification
    }

    // Security requirement: Email and phone must be verified
    if (!isEmailVerified) {
      Alert.alert('Email Verification Required', 'For security purposes, you must verify your email address before saving your settings.')
      return false
    }

    if (!isPhoneVerified) {
      Alert.alert('Phone Verification Required', 'For security purposes, you must verify your phone number before saving your settings.')
      return false
    }

    if (!isValid) {
      // Check each field for errors
      for (const field of Object.keys(formData)) {
        const fieldErrors = getFieldErrors(field)
        if (fieldErrors.length > 0 && !newErrors[field as keyof FormErrors]) {
          newErrors[field as keyof FormErrors] = fieldErrors[0]
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // Save to SettingsStore with error checking
      const saveOperations = [
        { key: settingsKeys.nickName, data: formData.nickName },
        { key: settingsKeys.email, data: formData.email },
        { key: settingsKeys.phone, data: formData.phoneNumber },
        { key: settingsKeys.classificationType, data: formData.classificationType },
        { key: settingsKeys.isPrimary, data: formData.isPrimary },
        { key: settingsKeys.termsAccepted, data: formData.termsAccepted },
      ]

      for (const operation of saveOperations) {
        const success = SettingsStore.setItem(operation)
        if (!success) {
          throw new Error(labels.saveOperationFailed(operation.key))
        }
      }
      // Update previousData after successful save
      setPreviousData(formData)
      Alert.alert(labels.success, labels.settingsSavedSuccess)

      if (onSettingsComplete) {
        onSettingsComplete()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      Alert.alert(labels.error, labels.settingsSaveFailed)
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = async (field: keyof FormData, value: string | boolean) => {
    // Reset phone verification state when the phone number changes
    if (field === 'phoneNumber' && typeof value === 'string' && value !== formData.phoneNumber) {
      setIsPhoneVerified(false)
      setShowVerificationCode(false)
      setVerificationCode('')
      setVerificationAttempts(0)
      setIsVerificationLocked(false)
      // Clear the phoneVerified flag in storage
      SettingsStore.setItem({
        key: settingsKeys.phoneVerified,
        data: false,
      })
    }

    // Reset email verification state when the email changes
    if (field === 'email' && typeof value === 'string' && value !== formData.email) {
      setIsEmailVerified(false)
      setShowEmailVerificationCode(false)
      setEmailVerificationCode('')
      setEmailVerificationAttempts(0)
      setIsEmailVerificationLocked(false)
      // Clear the emailVerified flag in storage
      SettingsStore.setItem({
        key: settingsKeys.emailVerified,
        data: false,
      })
    }

    // Special handling for isPrimary toggle
    if (field === 'isPrimary' && value === false && formData.isPrimary === true) {
      // Check if there are connected devices
      try {
        const connectedDevices = await DevicesStore.getConnectedDevices()
        if (connectedDevices && connectedDevices.length > 0) {
          // Show confirmation dialog
          Alert.alert(labels.confirmDeviceStatusChange, labels.deviceStatusChangeWarning(connectedDevices.length), [
            {
              text: labels.cancel,
              style: 'cancel',
              onPress: () => {
                // Don't change the value, keep it as primary
                return
              },
            },
            {
              text: labels.continue,
              style: 'destructive',
              onPress: () => {
                setFormData(prev => ({ ...prev, [field]: value }))
                // Clear error for this field
                if (errors[field]) {
                  setErrors(prev => ({ ...prev, [field]: undefined }))
                }
              },
            },
          ])
          return
        }
      } catch (error) {
        console.error('Error checking connected devices:', error)
      }
    }

    // Auto-set device classification based on email type when user changes email
    if (field === 'email' && typeof value === 'string') {
      const email = value.trim()

      // Auto-set classification whenever user changes email
      if (email && email.includes('@')) {
        const isBusiness = isBusinessEmail(email)
        const autoClassification = isBusiness ? 'corp' : 'personal'

        setFormData(prev => ({
          ...prev,
          [field]: value,
          classificationType: autoClassification as ClassificationType,
        }))

        // Clear errors for both fields
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: undefined }))
        }
        if (errors.classificationType) {
          setErrors(prev => ({ ...prev, classificationType: undefined }))
        }
        return
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const showClassificationPicker = () => {
    if (Platform.OS === 'ios') {
      const options = ['Cancel', ...classificationOptions.map((option: { label: any }) => option.label)]
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex !== 0) {
            const selectedOption = classificationOptions[buttonIndex - 1]
            updateField('classificationType', selectedOption.value)
          }
        },
      )
    } else {
      // For Android, we'll use a simple alert with buttons
      Alert.alert(labels.selectClassificationTitle, '', [
        { text: labels.cancel, style: 'cancel' },
        ...classificationOptions.map((option: { label: any; value: string | boolean }) => ({
          text: option.label,
          onPress: () => updateField('classificationType', option.value),
        })),
      ])
    }
  }

  const getClassificationLabel = (value: ClassificationType) => {
    if (!value || value === ('' as ClassificationType)) {
      return labels.classificationPlaceholder
    }
    const option = classificationOptions.find((opt: { value: any }) => opt.value === value)
    return option ? option.label : labels.classificationPlaceholder
  }

  const handleVerifyPhone = async () => {
    // Validate phone number first
    if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
      Alert.alert(labels.error, 'Please enter a phone number first')
      return
    }

    setIsSendingCode(true)
    try {
      // Send verification code via SMS
      await api.post('/sms/verify', {
        phone: formData.phoneNumber,
      })

      // Reset verification attempts when sending new code
      setShowVerificationCode(true)
      setVerificationCode('')
      setVerificationAttempts(0)
      setIsVerificationLocked(false)
      Alert.alert(labels.success, 'Verification code sent to your phone')
    } catch (error: any) {
      console.error('Send SMS error:', error)
      const errorMessage = error?.message || 'Failed to send verification code. Please try again.'
      Alert.alert(labels.error, errorMessage)
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== CELL_COUNT) {
      return
    }

    if (isVerificationLocked) {
      Alert.alert('Verification Locked', 'Too many failed attempts. Please request a new verification code.', [
        {
          text: 'OK',
          onPress: () => {
            setShowVerificationCode(false)
            setVerificationCode('')
            setVerificationAttempts(0)
            setIsVerificationLocked(false)
          },
        },
      ])
      return
    }

    setIsVerifyingCode(true)
    try {
      // Verify the SMS code with the backend
      await api.post('/sms/verify/confirm', {
        phone: formData.phoneNumber,
        code: verificationCode,
      })

      // Mark phone as verified
      SettingsStore.setItem({
        key: settingsKeys.phoneVerified,
        data: true,
      })
      setIsPhoneVerified(true)
      setShowVerificationCode(false)
      setVerificationCode('')
      setVerificationAttempts(0)

      Alert.alert(labels.success, 'Phone number verified successfully!')
    } catch (error: any) {
      console.error('Verification error:', error)
      const newAttempts = verificationAttempts + 1
      setVerificationAttempts(newAttempts)
      setVerificationCode('')

      if (newAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        setIsVerificationLocked(true)
        Alert.alert('Verification Locked', 'Too many failed attempts. Please request a new verification code.', [
          {
            text: 'OK',
            onPress: () => {
              setShowVerificationCode(false)
              setVerificationAttempts(0)
              setIsVerificationLocked(false)
            },
          },
        ])
      } else {
        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts
        const errorMessage = error?.message || 'Invalid or expired verification code. Please try again.'
        Alert.alert(labels.error, `${errorMessage}\n\nAttempts remaining: ${remainingAttempts}`)
      }
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleResendCode = async () => {
    setIsSendingCode(true)
    try {
      await api.post('/sms/verify/resend', {
        phone: formData.phoneNumber,
      })

      // Reset attempts when resending
      setVerificationCode('')
      setVerificationAttempts(0)
      setIsVerificationLocked(false)
      Alert.alert(labels.success, 'New verification code sent to your phone')
    } catch (error: any) {
      console.error('Resend error:', error)
      const errorMessage = error?.message || 'Failed to resend code. Please try again.'
      Alert.alert(labels.error, errorMessage)
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyEmail = async () => {
    // Validate email first
    if (!formData.email || formData.email.trim() === '') {
      Alert.alert(labels.error, 'Please enter an email address first')
      return
    }

    // Validate nickname for registration
    if (!formData.nickName || formData.nickName.trim() === '') {
      Alert.alert(labels.error, 'Please enter a nickname first before verifying your email')
      return
    }

    setIsSendingEmailCode(true)
    try {
      console.log('Attempting email registration with:', {
        email: formData.email.trim().toLowerCase(),
        name: formData.nickName.trim()
      })
      
      // Send verification code via email using /auth/register endpoint
      const response = await api.post('/auth/register', {
        email: formData.email.trim().toLowerCase(),
        name: formData.nickName.trim(),
      })
      
      console.log('Registration response:', response)

      // Reset verification attempts when sending new code
      setShowEmailVerificationCode(true)
      setEmailVerificationCode('')
      setEmailVerificationAttempts(0)
      setIsEmailVerificationLocked(false)
      Alert.alert(labels.success, 'Verification code sent to your email')
    } catch (error: any) {
      console.error('Send email error:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        response: error?.response
      })
      
      // Handle specific error cases
      let errorMessage = 'Failed to send verification code. Please try again.'
      if (error?.message) {
        if (error.message.toLowerCase().includes('registration failed')) {
          errorMessage = 'Registration failed. Please check your email address and try again. If the problem persists, contact support.'
        } else if (error.message.toLowerCase().includes('already exists') || error.message.toLowerCase().includes('already registered')) {
          errorMessage = 'This email is already registered. Please try a different email address or contact support if this is your email.'
        } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else if (error.status === 404) {
          errorMessage = 'Registration service not found. Please contact support.'
        } else if (error.status === 500) {
          errorMessage = 'Server error occurred. Please try again later or contact support.'
        } else {
          errorMessage = error.message
        }
      }
      
      Alert.alert(labels.error, errorMessage)
    } finally {
      setIsSendingEmailCode(false)
    }
  }

  const handleVerifyEmailCode = async () => {
    if (emailVerificationCode.length !== CELL_COUNT) {
      return
    }

    if (isEmailVerificationLocked) {
      Alert.alert('Verification Locked', 'Too many failed attempts. Please request a new verification code.', [
        {
          text: 'OK',
          onPress: () => {
            setShowEmailVerificationCode(false)
            setEmailVerificationCode('')
            setEmailVerificationAttempts(0)
            setIsEmailVerificationLocked(false)
          },
        },
      ])
      return
    }

    setIsVerifyingEmailCode(true)
    try {
      // Verify the email code with the backend
      await api.post('/auth/register/verify', {
        email: formData.email,
        code: emailVerificationCode,
      })

      // Mark email as verified
      SettingsStore.setItem({
        key: settingsKeys.emailVerified,
        data: true,
      })
      setIsEmailVerified(true)
      setShowEmailVerificationCode(false)
      setEmailVerificationCode('')
      setEmailVerificationAttempts(0)

      Alert.alert(labels.success, 'Email address verified successfully!')
    } catch (error: any) {
      console.error('Email verification error:', error)
      const newAttempts = emailVerificationAttempts + 1
      setEmailVerificationAttempts(newAttempts)
      setEmailVerificationCode('')

      if (newAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        setIsEmailVerificationLocked(true)
        Alert.alert('Verification Locked', 'Too many failed attempts. Please request a new verification code.', [
          {
            text: 'OK',
            onPress: () => {
              setShowEmailVerificationCode(false)
              setEmailVerificationAttempts(0)
              setIsEmailVerificationLocked(false)
            },
          },
        ])
      } else {
        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts
        const errorMessage = error?.message || 'Invalid or expired verification code. Please try again.'
        Alert.alert(labels.error, `${errorMessage}\n\nAttempts remaining: ${remainingAttempts}`)
      }
    } finally {
      setIsVerifyingEmailCode(false)
    }
  }

  const handleResendEmailCode = async () => {
    setIsSendingEmailCode(true)
    try {
      await api.post('/auth/register', {
        email: formData.email.trim().toLowerCase(),
        name: formData.nickName?.trim() || formData.email.split('@')[0],
      })

      // Reset attempts when resending
      setEmailVerificationCode('')
      setEmailVerificationAttempts(0)
      setIsEmailVerificationLocked(false)
      Alert.alert(labels.success, 'New verification code sent to your email')
    } catch (error: any) {
      console.error('Resend email error:', error)
      
      // Handle specific error cases
      let errorMessage = 'Failed to resend code. Please try again.'
      if (error?.message) {
        if (error.message.toLowerCase().includes('registration failed')) {
          errorMessage = 'Registration failed. Please check your email address and try again. If the problem persists, contact support.'
        } else if (error.message.toLowerCase().includes('already exists') || error.message.toLowerCase().includes('already registered')) {
          errorMessage = 'This email is already registered. Please try a different email address or contact support if this is your email.'
        } else {
          errorMessage = error.message
        }
      }
      
      Alert.alert(labels.error, errorMessage)
    } finally {
      setIsSendingEmailCode(false)
    }
  }

  const handleTermsPress = async () => {
    if (termsData.length === 0) {
      setIsLoadingTerms(true)
      try {
        const terms = await fetchTermsAndConditions()
        setTermsData(terms.sections)
      } catch (error) {
        console.error('Failed to load terms:', error)
        // Since we have fallback content, this shouldn't happen, but just in case
        Alert.alert('Error', 'Failed to load terms and conditions. Please try again.')
        return
      } finally {
        setIsLoadingTerms(false)
      }
    }
    setShowTermsDrawer(true)
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <Header title={labels.settingsTitle} navigation={navigation} onFAQPress={onFAQPress} />

      <View style={styles.content}>
        <View marginB-20>
          <Text text70 color={colors.textLightColor} marginB-10>
            {labels.nicknameRequired}
          </Text>
          <TextField
            placeholder={labels.nicknamePlaceholder}
            value={formData.nickName}
            onChangeText={value => updateField('nickName', value)}
            style={styles.input}
            placeholderTextColor={colors.textDarkColor}
            color={colors.textLightColor}
            validationMessage={errors.nickName}
            validationMessageStyle={styles.errorText}
            enableErrors={!!errors.nickName}
          />
        </View>

        <View marginB-20>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
          >
            <Text text70 color={colors.textLightColor}>
              {labels.emailRequired}
            </Text>
            {isEmailVerified && (
              <Text text80 style={{ color: '#4CAF50' }}>
                ✓ Verified
              </Text>
            )}
          </View>
          <TextField
            placeholder={labels.emailPlaceholder}
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            style={styles.input}
            placeholderTextColor={colors.textDarkColor}
            color={colors.textLightColor}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            validationMessage={errors.email}
            validationMessageStyle={styles.errorText}
            enableErrors={!!errors.email}
          />

          {!isEmailVerified && !showEmailVerificationCode && (
            <Button
              label="Verify Email Address"
              onPress={handleVerifyEmail}
              disabled={isSendingEmailCode || !formData.email}
              loading={isSendingEmailCode}
              variant="secondary"
              size="small"
              style={{ marginTop: 10 }}
            />
          )}

          {showEmailVerificationCode && (
            <View marginT-20>
              <Text text70 color={colors.textLightColor} marginB-10 center>
                Enter Verification Code
              </Text>
              <Text text80 color={colors.textDarkColor} marginB-15 center>
                We've sent a 6-digit code to your email
              </Text>

              <CodeField
                ref={emailCodeFieldRef}
                {...emailCodeFieldProps}
                value={emailVerificationCode}
                onChangeText={setEmailVerificationCode}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                renderCell={({ index, symbol, isFocused }) => (
                  <View
                    key={index}
                    style={[styles.codeCell, isFocused && styles.codeCellFocused]}
                    onLayout={getEmailCellOnLayoutHandler(index)}
                  >
                    <Text style={styles.codeCellText}>{symbol || (isFocused ? <Cursor /> : null)}</Text>
                  </View>
                )}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <Button
                  label="Resend Code"
                  onPress={handleResendEmailCode}
                  disabled={isSendingEmailCode || isVerifyingEmailCode}
                  loading={isSendingEmailCode}
                  variant="secondary"
                  size="small"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Cancel"
                  onPress={() => {
                    setShowEmailVerificationCode(false)
                    setEmailVerificationCode('')
                  }}
                  disabled={isSendingEmailCode || isVerifyingEmailCode}
                  variant="outline"
                  size="small"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>

        <View marginB-20>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
          >
            <Text text70 color={colors.textLightColor}>
              {labels.phoneNumberRequired}
            </Text>
            {isPhoneVerified && (
              <Text text80 style={{ color: '#4CAF50' }}>
                ✓ Verified
              </Text>
            )}
          </View>
          <PhoneInput
            value={formData.phoneNumber}
            onChangePhoneNumber={value => updateField('phoneNumber', value)}
            defaultCountry={DEFAULT_COUNTRY}
            selectedCountries={getAllowedCountryCodes()}
            placeholder={labels.phoneNumberPlaceholder}
            phoneInputStyles={{
              container: {
                backgroundColor: '#1a1a1a',
                borderWidth: 1,
                borderColor: errors.phoneNumber ? '#ff4444' : '#333',
                borderRadius: 8,
              },
              flagContainer: {
                backgroundColor: '#1a1a1a',
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
              },
              flag: {},
              caret: {
                color: '#666',
                fontSize: 16,
              },
              divider: {
                backgroundColor: '#333',
              },
              callingCode: {
                color: colors.textLightColor,
                fontSize: 16,
              },
              input: {
                color: colors.textLightColor,
                fontSize: 16,
              },
            }}
          />
          {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

          {!isPhoneVerified && !showVerificationCode && (
            <Button
              label="Verify Phone Number"
              onPress={handleVerifyPhone}
              disabled={isSendingCode || !formData.phoneNumber}
              loading={isSendingCode}
              variant="secondary"
              size="small"
              style={{ marginTop: 10 }}
            />
          )}

          {showVerificationCode && (
            <View marginT-20>
              <Text text70 color={colors.textLightColor} marginB-10 center>
                Enter Verification Code
              </Text>
              <Text text80 color={colors.textDarkColor} marginB-15 center>
                We've sent a 6-digit code to your phone
              </Text>

              <CodeField
                ref={codeFieldRef}
                {...codeFieldProps}
                value={verificationCode}
                onChangeText={setVerificationCode}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                renderCell={({ index, symbol, isFocused }) => (
                  <View
                    key={index}
                    style={[styles.codeCell, isFocused && styles.codeCellFocused]}
                    onLayout={getCellOnLayoutHandler(index)}
                  >
                    <Text style={styles.codeCellText}>{symbol || (isFocused ? <Cursor /> : null)}</Text>
                  </View>
                )}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <Button
                  label="Resend Code"
                  onPress={handleResendCode}
                  disabled={isSendingCode || isVerifyingCode}
                  loading={isSendingCode}
                  variant="secondary"
                  size="small"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Cancel"
                  onPress={() => {
                    setShowVerificationCode(false)
                    setVerificationCode('')
                  }}
                  disabled={isSendingCode || isVerifyingCode}
                  variant="outline"
                  size="small"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>

        <View marginB-30>
          <Text text70 color={colors.textLightColor} marginB-10>
            {labels.deviceClassificationRequired}
          </Text>
          <TouchableOpacity
            style={[styles.picker, errors.classificationType && styles.pickerError]}
            onPress={showClassificationPicker}
          >
            <Text
              style={[
                styles.pickerText,
                (!formData.classificationType || formData.classificationType === ('' as ClassificationType)) &&
                  styles.placeholderText,
              ]}
            >
              {getClassificationLabel(formData.classificationType)}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
          {errors.classificationType && <Text style={styles.errorText}>{errors.classificationType}</Text>}
        </View>

        <View marginB-30>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text text70 color={colors.textLightColor}>
                  {labels.setPrimaryDevice}
                </Text>
                <TouchableOpacity
                  style={styles.infoIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setShowPrimaryHint(true)}
                >
                  <Text style={styles.infoIconText}>ⓘ</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Switch
              value={formData.isPrimary}
              onValueChange={value => updateField('isPrimary', value)}
              onColor={colors.primaryColor}
              offColor="#333"
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Info Popover Modal */}
        <Modal
          visible={showPrimaryHint}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPrimaryHint(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPrimaryHint(false)}>
            <Pressable style={styles.popoverContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.popoverArrow} />
              <View style={styles.popoverContent}>
                <Text style={styles.popoverText}>{labels.primaryDeviceDescription}</Text>
                <TouchableOpacity onPress={() => setShowPrimaryHint(false)} style={styles.popoverCloseButton}>
                  <Text style={styles.popoverCloseText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <View marginB-30>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text text70 color={colors.textLightColor}>
                  I have read and agree to the{' '}
                </Text>
                <TouchableOpacity onPress={handleTermsPress} disabled={isLoadingTerms}>
                  <Text style={[styles.linkText, isLoadingTerms && { opacity: 0.5 }]}>
                    {isLoadingTerms ? 'Loading...' : 'terms and conditions'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Switch
              value={formData.termsAccepted}
              onValueChange={value => updateField('termsAccepted', value)}
              onColor={colors.primaryColor}
              offColor="#333"
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Terms and Conditions Drawer */}
        <DrawerOverlay
          visible={showTermsDrawer}
          onClose={() => setShowTermsDrawer(false)}
          title="Terms and Conditions"
          width="100%"
        >
          <View style={styles.termsContent}>
            {termsData.map((section, index) => (
              <View key={index} style={styles.termsSection}>
                <Text style={styles.termsSectionTitle}>{section.title}</Text>
                <Text style={styles.termsSectionContent}>{section.content}</Text>
              </View>
            ))}
          </View>
        </DrawerOverlay>

        <Button
          label={labels.saveSettings}
          onPress={handleSave}
          disabled={isLoading}
          loading={isLoading}
          variant="primary"
          size="medium"
          style={styles.saveButton}
        />
        <Button
          label={labels.resetSettings}
          onPress={handleResetSettings}
          disabled={isLoading}
          loading={isLoading}
          variant="secondary"
          size="medium"
          style={styles.saveButton}
        />
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
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  picker: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerError: {
    borderColor: '#ff4444',
  },
  pickerText: {
    color: '#ffffff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#666',
  },
  pickerArrow: {
    color: '#666',
    fontSize: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 15,
  },
  saveButton: {
    marginTop: 20,
  },
  codeFieldRoot: {
    marginTop: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  codeCell: {
    width: 45,
    height: 55,
    lineHeight: 53,
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  codeCellFocused: {
    borderColor: colors.primaryColor || '#007AFF',
  },
  codeCellText: {
    fontSize: 24,
    color: colors.textLightColor || '#ffffff',
    textAlign: 'center',
  },
  infoIcon: {
    marginLeft: 8,
    padding: 2,
  },
  infoIconText: {
    color: colors.primaryColor || '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverContainer: {
    position: 'relative',
    width: '85%',
    maxWidth: 320,
  },
  popoverArrow: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2a2a2a',
  },
  popoverContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  popoverText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  popoverCloseButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: colors.primaryColor || '#007AFF',
    borderRadius: 8,
  },
  popoverCloseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primaryColor || '#007AFF',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  termsContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexGrow: 1,
  },
  termsSection: {
    marginBottom: 25,
  },
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textLightColor || '#ffffff',
    marginBottom: 10,
  },
  termsSectionContent: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textLightColor || '#ffffff',
  },
})

export default SettingsScreen
