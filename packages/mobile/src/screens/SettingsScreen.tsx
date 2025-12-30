// @ts-nocheck
import { api } from '@pzero/shared/api'
import { labels } from '@pzero/shared/constants'
import { genGrid } from '@pzero/shared/grid/grid'
import { DEFAULT_COUNTRY, getAllowedCountryCodes, isValidPhoneNumber, validatePhoneNumber } from '@pzero/shared/phone'
import type { Section } from '@pzero/shared/pzero'
import { generateNameFromEmail } from '@pzero/shared/pzero/users'
import { isBusinessEmail } from '@pzero/shared/validator'
import type { NavigationProp } from '@react-navigation/native'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Switch, Text, TextField, View } from 'react-native-ui-lib'
import Button from '../components/Button'
import DrawerOverlay from '../components/DrawerOverlay'
import Header from '../components/Header'
import PhoneNumberInput from '../components/PhoneNumberInput'
import PolicyDrawer from '../components/PolicyDrawer'
import { PencilIcon } from '../icons'
import { fetchPrivacyPolicy, fetchTermsAndConditions } from '../services/content'
import { stores } from '../stores'
import {
  type ClassificationType,
  classificationTypes,
  SettingsStore,
  settingsKeys,
  userSettingsSchema,
} from '../stores/settings'
import { borderRadius, buttons, colors, fontSize, fontWeight, inputs, spacing, status, surfaces, text } from '../theme'

const CELL_COUNT = 6

const ajv = new Ajv()
addFormats(ajv)

const classificationOptions = Object.values(classificationTypes).map((type: string) => ({
  label: type.charAt(0).toUpperCase() + type.slice(1),
  value: type,
}))

const validate = ajv.compile(userSettingsSchema)

interface FormData {
  name: string
  deviceNickName: string
  email: string
  phoneNumber: string
  classificationType: ClassificationType
  isPrimary: boolean
  policiesAccepted: boolean
}

interface FormErrors {
  name?: string
  deviceNickName?: string
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
    name: '',
    deviceNickName: '',
    email: '',
    phoneNumber: '',
    classificationType: '' as ClassificationType,
    isPrimary: false,
    policiesAccepted: false,
  })
  const [previousData, setPreviousData] = useState<FormData>(formData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touchedFields, setTouchedFields] = useState<Set<keyof FormErrors>>(new Set())
  const [fieldsWithInput, setFieldsWithInput] = useState<Set<keyof FormErrors>>(new Set())
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
  const [emailBeingVerified, setEmailBeingVerified] = useState('')
  const [phoneBeingVerified, setPhoneBeingVerified] = useState('')
  const [tempPhone, setTempPhone] = useState('')
  // Store the grid to reuse for resend requests
  const [registrationGrid, setRegistrationGrid] = useState<number[][] | null>(null)

  // Popover state
  const [showPrimaryHint, setShowPrimaryHint] = useState(false)

  // Cleanup ref for timeouts
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const switchToggleRef = useRef<boolean>(false)

  // Terms and conditions state
  const [showTermsDrawer, setShowTermsDrawer] = useState(false)
  const [termsData, setTermsData] = useState<Section[]>([])
  const [isLoadingTerms, setIsLoadingTerms] = useState(false)
  const [readTerms, setReadTerms] = useState(false)

  // Privacy policy state
  const [showPrivacyDrawer, setShowPrivacyDrawer] = useState(false)
  const [privacyData, setPrivacyData] = useState<Section[]>([])
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false)
  const [readPrivacy, setReadPrivacy] = useState(false)

  // Verification drawer state
  const [showVerificationDrawer, setShowVerificationDrawer] = useState(false)
  const [verificationStep, setVerificationStep] = useState<'email' | 'emailSuccess' | 'phone'>('email')
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState('')
  const [tempEmail, setTempEmail] = useState('')

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
    return () => {
      clearInterval(intervalId)
      // Clean up any pending timeouts
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
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
      const name = SettingsStore.getItem('name') || ''
      const email = SettingsStore.getItem(settingsKeys.email) || ''
      const phoneNumber = SettingsStore.getItem(settingsKeys.phone) || ''
      let classificationType = SettingsStore.getItem(settingsKeys.classificationType) || ''

      // Load device nickname from DevicesStore
      let deviceNickName = ''
      try {
        await DevicesStore.init()
        const currentDevice = await DevicesStore.getCurrentDeviceInfo()
        deviceNickName = currentDevice?.nickname || ''
      } catch (error) {
        console.error('Failed to load device nickname:', error)
      }

      // Load isPrimary from DevicesStore (source of truth)
      let isPrimary = false
      try {
        await DevicesStore.init()
        isPrimary = DevicesStore.isPrimaryDevice
      } catch (error) {
        console.error('Failed to initialize DevicesStore:', error)
        // Default to false if we can't load the device status
        // This ensures UI remains functional even if store fails
      }

      const phoneVerified = SettingsStore.getItem(settingsKeys.phoneVerified) || false
      const emailVerified = SettingsStore.getItem(settingsKeys.emailVerified) || false
      // Migrate from old 'termsAccepted' to new 'policiesAccepted' key
      let policiesAccepted = SettingsStore.getItem(settingsKeys.policiesAccepted)
      if (policiesAccepted === null || policiesAccepted === undefined) {
        // Try to migrate from old key name
        const oldTermsAccepted = SettingsStore.getItem('termsAccepted')
        if (oldTermsAccepted !== null && oldTermsAccepted !== undefined) {
          policiesAccepted = oldTermsAccepted
          // Migrate the value to new key
          SettingsStore.setItem({ key: settingsKeys.policiesAccepted, data: oldTermsAccepted })
          // Remove old key (optional cleanup)
          // SettingsStore.removeItem('termsAccepted')
        } else {
          policiesAccepted = false
        }
      }
      // Auto-set classification based on email if classification is empty or unknown
      if (email && (!classificationType || classificationType === 'unknown')) {
        const isBusiness = isBusinessEmail(email)
        classificationType = isBusiness ? 'corp' : 'personal'
      }
      setPreviousData({
        name,
        deviceNickName,
        email,
        phoneNumber,
        classificationType,
        isPrimary,
        policiesAccepted: Boolean(policiesAccepted),
      })
      setFormData({
        name,
        deviceNickName,
        email,
        phoneNumber,
        classificationType: (classificationType || 'unknown') as ClassificationType,
        isPrimary: isPrimary as boolean,
        policiesAccepted: Boolean(policiesAccepted),
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

    // Check if email or phone changed and needs verification
    const emailChanged = formData.email !== previousData.email
    const phoneChanged = formData.phoneNumber !== previousData.phoneNumber

    // Only require verification for changed fields
    const needsEmailVerification = emailChanged && !isEmailVerified
    const needsPhoneVerification = phoneChanged && !isPhoneVerified

    // If no verification needed, save directly
    if (!needsEmailVerification && !needsPhoneVerification) {
      await performSave()
      return
    }

    // Show verification drawer starting with the first field that needs verification
    setVerificationStep(needsEmailVerification ? 'email' : 'phone')
    setShowVerificationDrawer(true)
  }

  const performSave = async () => {
    setIsLoading(true)
    try {
      // Save to SettingsStore with error checking (except isPrimary which is handled by DevicesStore)
      const saveOperations = [
        { key: 'name', data: formData.name },
        { key: settingsKeys.email, data: formData.email },
        { key: settingsKeys.phone, data: formData.phoneNumber },
        { key: settingsKeys.classificationType, data: formData.classificationType },
        { key: settingsKeys.policiesAccepted, data: formData.policiesAccepted },
      ]

      // Update device nickname in DevicesStore
      try {
        const currentDevice = await DevicesStore.getCurrentDeviceInfo()
        if (currentDevice) {
          currentDevice.nickname = formData.deviceNickName
          DevicesStore.setItem({
            key: 'current',
            data: currentDevice,
            isTransit: false,
          })
        }
      } catch (error) {
        console.error('Error saving device nickname:', error)
      }

      for (const operation of saveOperations) {
        const success = SettingsStore.setItem(operation)
        if (!success) {
          throw new Error(labels.saveOperationFailed(operation.key))
        }
      }

      // Also save isPrimary to SettingsStore for consistency (DevicesStore is the source of truth)
      SettingsStore.setItem({ key: settingsKeys.isPrimary, data: DevicesStore.isPrimaryDevice })

      // Update previousData after successful save
      setPreviousData({ ...formData, isPrimary: DevicesStore.isPrimaryDevice })
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

  const applyPrimaryDeviceChange = async (value: boolean) => {
    console.log('Settings: Updating isPrimary to', value)

    // Use the proper store method to update primary device status
    const updatedDevice = await DevicesStore.setIsPrimaryDevice(value)

    console.log('Settings: DevicesStore.isPrimaryDevice is now', DevicesStore.isPrimaryDevice)
    console.log('Settings: Saved to storage with isPrimary:', updatedDevice.isPrimaryDevice)

    setFormData(prev => ({ ...prev, isPrimary: value }))
  }

  const updateField = async (field: keyof FormData, value: string | boolean) => {
    // Handle isPrimary toggle - check for confirmation first if disabling
    if (field === 'isPrimary' && typeof value === 'boolean') {
      if (value === false && formData.isPrimary === true) {
        // Check if there are connected devices first
        try {
          const connectedDevices = await DevicesStore.getConnectedDevices()
          if (connectedDevices && connectedDevices.length > 0) {
            Alert.alert(labels.confirmDeviceStatusChange, labels.deviceStatusChangeWarning(connectedDevices.length), [
              { text: labels.cancel, style: 'cancel' },
              {
                text: labels.continue,
                style: 'destructive',
                onPress: async () => await applyPrimaryDeviceChange(value),
              },
            ])
            return
          }
        } catch (error) {
          console.error('Error checking connected devices:', error)
        }
      }
      await applyPrimaryDeviceChange(value)
      return
    }

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

    // Auto-set device classification and name based on email type when user changes email
    if (field === 'email' && typeof value === 'string') {
      const email = value.trim()

      // Auto-set classification and name whenever user changes email
      if (email && email.includes('@')) {
        const isBusiness = isBusinessEmail(email)
        const autoClassification = isBusiness ? 'corp' : 'personal'

        // Auto-generate name from email if name is empty
        let autoName = formData.name
        if (!formData.name || formData.name.trim() === '') {
          autoName = generateNameFromEmail(email)
        }

        setFormData(prev => ({
          ...prev,
          [field]: value,
          name: autoName,
          classificationType: autoClassification as ClassificationType,
        }))

        // Clear errors for relevant fields
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: undefined }))
        }
        if (errors.classificationType) {
          setErrors(prev => ({ ...prev, classificationType: undefined }))
        }
        if (errors.name) {
          setErrors(prev => ({ ...prev, name: undefined }))
        }
        return
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }))

    // Track that user has entered input in this field (if it's a string field with content)
    if (typeof value === 'string' && value.trim() !== '') {
      setFieldsWithInput(prev => new Set(prev).add(field as keyof FormErrors))
    } else if (typeof value === 'string' && value.trim() === '') {
      // Remove from fields with input if emptied
      setFieldsWithInput(prev => {
        const newSet = new Set(prev)
        newSet.delete(field as keyof FormErrors)
        return newSet
      })
    }

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

  const generateDeviceNicknameFromName = (name: string) => {
    if (!name) return ''

    // Take the first name
    const firstName = name.split(' ')[0]

    // Try to get actual device name from DevicesStore
    let deviceType = 'Device'
    try {
      const currentDevice = DevicesStore.currentDevice
      if (currentDevice?.deviceName) {
        // Use the actual device name (e.g., "iPhone", "iPad", "Samsung Galaxy")
        deviceType = currentDevice.deviceName
      } else if (currentDevice?.model) {
        // Fallback to model if deviceName not available
        deviceType = currentDevice.model
      }
    } catch (error) {
      // Fallback to generic "Device" if can't get device info
    }

    return `${firstName}'s ${deviceType}`
  }

  const hasFormChanges = () => {
    return (
      formData.name !== previousData.name ||
      formData.deviceNickName !== previousData.deviceNickName ||
      formData.email !== previousData.email ||
      formData.phoneNumber !== previousData.phoneNumber ||
      formData.classificationType !== previousData.classificationType ||
      formData.isPrimary !== previousData.isPrimary ||
      formData.policiesAccepted !== previousData.policiesAccepted
    )
  }

  const isFormValid = () => {
    // Check if there are any changes
    if (!hasFormChanges()) {
      return false
    }

    // Auto-generate name from email if name is empty
    if (!formData.name || formData.name.trim() === '') {
      if (formData.email && formData.email.trim() !== '') {
        const autoName = generateNameFromEmail(formData.email.trim())
        if (autoName) {
          updateField('name', autoName)
        }
      }
    }

    // Auto-generate device nickname from name if device nickname is empty
    if (!formData.deviceNickName || formData.deviceNickName.trim() === '') {
      if (formData.name && formData.name.trim() !== '') {
        const autoDeviceNickname = generateDeviceNicknameFromName(formData.name.trim())
        if (autoDeviceNickname) {
          updateField('deviceNickName', autoDeviceNickname)
        }
      }
    }

    // Check each required field individually using validation functions
    const nameValid = !validateName(formData.name)
    const deviceNicknameValid = !validateDeviceNickName(formData.deviceNickName)
    const emailValid = !validateEmail(formData.email)

    // Validate phone number using libphonenumber-js
    const phoneValid = !validatePhone(formData.phoneNumber)

    // Check if terms and conditions are accepted
    const termsAccepted = formData.policiesAccepted

    return nameValid && deviceNicknameValid && emailValid && phoneValid && termsAccepted
  }

  const handleVerifyPhone = async () => {
    // Apply changes if editing
    const finalPhone = isEditing && tempPhone ? tempPhone.trim() : formData.phoneNumber

    // Validate phone number first
    if (!finalPhone || finalPhone.trim() === '') {
      Alert.alert(labels.error, 'Please enter a phone number first')
      return
    }

    // Update the form data with the edited value
    if (isEditing) {
      if (tempPhone && tempPhone.trim() !== formData.phoneNumber) {
        updateField('phoneNumber', tempPhone.trim())
      }
      setIsEditing(false)
      setTempPhone('')
    }

    setIsSendingCode(true)
    try {
      // Send verification code via SMS
      await api.post('/sms/verify', {
        phone: finalPhone.trim(),
      })

      // Reset verification attempts when sending new code, show code input, and store phone being verified
      setShowVerificationCode(true)
      setVerificationCode('')
      setVerificationAttempts(0)
      setIsVerificationLocked(false)
      setPhoneBeingVerified(finalPhone.trim())
      // Don't show alert, just proceed to code input
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
        phone: phoneBeingVerified,
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

      // Check if terms need to be accepted
      if (!formData.policiesAccepted) {
        setShowVerificationDrawer(false)
        handleTermsPress()
      } else {
        // Complete the save process
        setShowVerificationDrawer(false)
        await performSave()
      }
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
        phone: phoneBeingVerified,
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
    // Apply changes if editing
    const finalName = isEditing && tempName ? tempName.trim() : formData.name
    const finalEmail = isEditing && tempEmail ? tempEmail.trim() : formData.email

    // Validate email first
    if (!finalEmail || finalEmail.trim() === '') {
      Alert.alert(labels.error, 'Please enter an email address first')
      return
    }

    // Validate name for registration
    if (!finalName || finalName.trim() === '') {
      Alert.alert(labels.error, 'Please enter your name first before verifying your email')
      return
    }

    // Update the form data with the edited values
    if (isEditing) {
      if (tempName && tempName.trim() !== formData.name) {
        updateField('name', tempName.trim())
      }
      if (tempEmail && tempEmail.trim() !== formData.email) {
        updateField('email', tempEmail.trim())
      }
      setIsEditing(false)
      setTempName('')
      setTempEmail('')
    }

    setIsSendingEmailCode(true)
    try {
      console.log('Attempting email registration with:', {
        email: finalEmail.trim().toLowerCase(),
        name: finalName.trim(),
      })

      // Get current device information
      let currentDeviceInfo
      try {
        currentDeviceInfo = await DevicesStore.getCurrentDeviceInfo()
        console.log('Device info for registration:', currentDeviceInfo)
      } catch (deviceError) {
        console.warn('Failed to get device info, proceeding without it:', deviceError)
        // Continue registration without device info if device detection fails
      }

      // Generate grid for password authentication
      const grid = genGrid(5)
      console.log('Generated grid for registration:', grid)
      // Store grid for potential resend requests
      setRegistrationGrid(grid)

      // Send verification code via email using /auth/register endpoint
      const registrationPayload = {
        email: finalEmail.trim().toLowerCase(),
        name: finalName.trim(),
        device: {
          ...currentDeviceInfo,
          type: 'MOBILE',
          nickname: formData.deviceNickName || `${finalName.split(' ')[0]}'s Device`,
        },
        grid,
      }

      console.log('Registration payload being sent:', JSON.stringify(registrationPayload, null, 2))

      const response = await api.post('/auth/register', registrationPayload)

      console.log('Registration response:', response)

      // Reset verification attempts when sending new code and store the email being verified
      setShowEmailVerificationCode(true)
      setEmailVerificationCode('')
      setEmailVerificationAttempts(0)
      setIsEmailVerificationLocked(false)
      setEmailBeingVerified(finalEmail.trim().toLowerCase())
      // Don't show alert, just proceed to code input
    } catch (error: any) {
      console.error('Send email error:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        response: error?.response,
      })

      // Handle specific error cases
      let errorMessage = 'Failed to send verification code. Please try again.'
      if (error?.message) {
        if (error.message.toLowerCase().includes('registration failed')) {
          errorMessage =
            'Registration failed. Please check your email address and try again. If the problem persists, contact support.'
        } else if (
          error.message.toLowerCase().includes('already exists') ||
          error.message.toLowerCase().includes('already registered')
        ) {
          errorMessage =
            'This email is already registered. Please try a different email address or contact support if this is your email.'
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
        email: emailBeingVerified,
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

      // Show success screen with smooth transition
      setVerificationStep('emailSuccess')

      // Clear any existing timeout
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }

      // Auto-transition to next step after showing success
      successTimeoutRef.current = setTimeout(async () => {
        try {
          // Check if phone changed and needs verification
          const phoneChanged = formData.phoneNumber !== previousData.phoneNumber
          const needsPhoneVerification = phoneChanged && !isPhoneVerified

          if (needsPhoneVerification) {
            // Reset phone verification state and prepare transition
            setIsEditing(false)
            setTempPhone('')
            setShowVerificationCode(false)
            setVerificationCode('')
            setVerificationAttempts(0)
            setIsVerificationLocked(false)
            setVerificationStep('phone')
          } else if (!formData.policiesAccepted) {
            // If phone doesn't need verification but terms not accepted, show terms
            setShowVerificationDrawer(false)
            handleTermsPress()
          } else {
            // All done, save
            setShowVerificationDrawer(false)
            await performSave()
          }
        } catch (error) {
          console.error('Error completing verification:', error)
          Alert.alert(labels.error, 'Failed to save settings. Please try again.')
        }
      }, 2000) // Show success for 2 seconds
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
      // Get current device information
      let currentDeviceInfo
      try {
        currentDeviceInfo = await DevicesStore.getCurrentDeviceInfo()
        console.log('Device info for email resend:', currentDeviceInfo)
      } catch (deviceError) {
        console.warn('Failed to get device info for resend, proceeding without it:', deviceError)
        // Continue resend without device info if device detection fails
      }

      // Reuse the original grid for consistency
      let grid = registrationGrid
      if (!grid) {
        // Fallback: generate new grid only if original is not available
        grid = genGrid(5)
        setRegistrationGrid(grid)
        console.warn('Original grid not found, generated new grid for resend:', grid)
      } else {
        console.log('Reusing original grid for registration resend:', grid)
      }

      const resendPayload = {
        email: emailBeingVerified,
        name: formData.name?.trim() || emailBeingVerified.split('@')[0],
        grid,
      }

      if (currentDeviceInfo) {
        resendPayload.device = currentDeviceInfo
      }

      await api.post('/auth/register', resendPayload)

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
          errorMessage =
            'Registration failed. Please check your email address and try again. If the problem persists, contact support.'
        } else if (
          error.message.toLowerCase().includes('already exists') ||
          error.message.toLowerCase().includes('already registered')
        ) {
          errorMessage =
            'This email is already registered. Please try a different email address or contact support if this is your email.'
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

  const handlePrivacyPress = async () => {
    if (privacyData.length === 0) {
      setIsLoadingPrivacy(true)
      try {
        const privacy = await fetchPrivacyPolicy()
        setPrivacyData(privacy.sections)
      } catch (error) {
        console.error('Failed to load privacy policy:', error)
        Alert.alert(
          'Privacy Policy Unavailable',
          'The privacy policy could not be loaded from the server. Please try again later or contact support.',
        )
        return
      } finally {
        setIsLoadingPrivacy(false)
      }
    }
    setShowPrivacyDrawer(true)
  }

  const handleEdit = () => {
    setTempName(formData.name)
    setTempEmail(formData.email)
    setTempPhone(formData.phoneNumber)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setTempName('')
    setTempEmail('')
    setTempPhone('')
    setIsEditing(false)
  }

  // Field validation functions
  const validateName = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Name is required'
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters'
    }
    return undefined
  }

  const validateDeviceNickName = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Device nickname is required'
    }
    if (value.trim().length < 2) {
      return 'Device nickname must be at least 2 characters'
    }
    return undefined
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Email address is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      return 'Please enter a valid email address'
    }
    return undefined
  }

  const validatePhone = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Phone number is required'
    }

    const phoneValidation = validatePhoneNumber(value.trim(), DEFAULT_COUNTRY)
    if (!phoneValidation.isValid) {
      return phoneValidation.error || 'Please enter a valid phone number'
    }
    return undefined
  }

  // Handle field blur events (when user tabs out)
  const handleFieldBlur = (field: keyof FormErrors, value: string) => {
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field))

    let error: string | undefined

    switch (field) {
      case 'name':
        error = validateName(value)
        break
      case 'deviceNickName':
        error = validateDeviceNickName(value)
        break
      case 'email':
        error = validateEmail(value)
        break
      case 'phoneNumber':
        error = validatePhone(value)
        break
    }

    setErrors(prev => ({
      ...prev,
      [field]: error,
    }))
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <Header title={labels.settingsTitle} navigation={navigation} onFAQPress={onFAQPress} />

      <View style={styles.content}>
        <View marginB-20>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
          >
            <Text text70 color={colors.textLightColor}>
              Email *
            </Text>
            {isEmailVerified && (
              <Text text80 style={{ color: status.success }}>
                ✓ Verified
              </Text>
            )}
          </View>
          <TextField
            placeholder={labels.emailPlaceholder}
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            onBlur={() => handleFieldBlur('email', formData.email)}
            style={styles.input}
            placeholderTextColor={colors.textDarkColor}
            color={colors.textLightColor}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            validationMessage={touchedFields.has('email') && fieldsWithInput.has('email') ? errors.email : undefined}
            validationMessageStyle={styles.errorText}
            enableErrors={!!(touchedFields.has('email') && fieldsWithInput.has('email') && errors.email)}
          />
        </View>

        <View marginB-20>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
          >
            <Text text70 color={colors.textLightColor}>
              Phone Number *
            </Text>
            {isPhoneVerified && (
              <Text text80 style={{ color: status.success }}>
                ✓ Verified
              </Text>
            )}
          </View>
          <PhoneNumberInput
            value={formData.phoneNumber}
            onChangePhoneNumber={value => updateField('phoneNumber', value)}
            onBlur={() => handleFieldBlur('phoneNumber', formData.phoneNumber)}
            defaultCountry={DEFAULT_COUNTRY}
            selectedCountries={getAllowedCountryCodes()}
            placeholder={labels.phoneNumberPlaceholder}
            hasError={touchedFields.has('phoneNumber') && fieldsWithInput.has('phoneNumber') && !!errors.phoneNumber}
          />
          {touchedFields.has('phoneNumber') && fieldsWithInput.has('phoneNumber') && errors.phoneNumber && (
            <Text style={styles.errorText}>{errors.phoneNumber}</Text>
          )}
        </View>

        <View marginB-20>
          <Text text70 color={colors.textLightColor} marginB-10>
            Full Name *
          </Text>
          <TextField
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={value => updateField('name', value)}
            onBlur={() => handleFieldBlur('name', formData.name)}
            style={styles.input}
            placeholderTextColor={colors.textDarkColor}
            color={colors.textLightColor}
            validationMessage={touchedFields.has('name') && fieldsWithInput.has('name') ? errors.name : undefined}
            validationMessageStyle={styles.errorText}
            enableErrors={!!(touchedFields.has('name') && fieldsWithInput.has('name') && errors.name)}
          />
        </View>

        <View marginB-20>
          <Text text70 color={colors.textLightColor} marginB-10>
            Device Nickname *
          </Text>
          <TextField
            placeholder="Enter device nickname"
            value={formData.deviceNickName}
            onChangeText={value => updateField('deviceNickName', value)}
            onBlur={() => handleFieldBlur('deviceNickName', formData.deviceNickName)}
            style={styles.input}
            placeholderTextColor={colors.textDarkColor}
            color={colors.textLightColor}
            validationMessage={
              touchedFields.has('deviceNickName') && fieldsWithInput.has('deviceNickName')
                ? errors.deviceNickName
                : undefined
            }
            validationMessageStyle={styles.errorText}
            enableErrors={
              !!(touchedFields.has('deviceNickName') && fieldsWithInput.has('deviceNickName') && errors.deviceNickName)
            }
          />
        </View>

        <View marginB-30>
          <Text text70 color={colors.textLightColor} marginB-10>
            Device Classification *
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
              offColor={colors.borderColor}
              thumbColor={colors.white}
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
              <View style={styles.termsTextContainer}>
                <Text text70 color={colors.textLightColor} style={styles.termsText}>
                  I have read and agree to the{' '}
                </Text>
                <TouchableOpacity onPress={handleTermsPress} disabled={isLoadingTerms} style={styles.inlineLink}>
                  <Text style={[styles.linkText, isLoadingTerms && { opacity: 0.5 }]}>
                    {isLoadingTerms ? 'Loading...' : 'terms and conditions'}
                  </Text>
                </TouchableOpacity>
                <Text text70 color={colors.textLightColor} style={styles.termsText}>
                  {' '}
                  and{' '}
                </Text>
                <TouchableOpacity onPress={handlePrivacyPress} disabled={isLoadingPrivacy} style={styles.inlineLink}>
                  <Text style={[styles.linkText, isLoadingPrivacy && { opacity: 0.5 }]}>
                    {isLoadingPrivacy ? 'Loading...' : 'privacy policy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Switch
              value={formData.policiesAccepted && readTerms && readPrivacy}
              onValueChange={value => {
                // Prevent multiple rapid calls
                if (switchToggleRef.current) return
                switchToggleRef.current = true
                setTimeout(() => {
                  switchToggleRef.current = false
                }, 100)

                if (value) {
                  // User is checking the box - show terms first, then privacy
                  if (!readTerms) {
                    handleTermsPress()
                  } else if (!readPrivacy) {
                    handlePrivacyPress()
                  } else {
                    // Both already read, just update the field
                    updateField('policiesAccepted', true)
                  }
                } else {
                  // User is unchecking - reset both
                  updateField('policiesAccepted', false)
                  setReadTerms(false)
                  setReadPrivacy(false)
                }
              }}
              onColor={colors.primaryColor}
              offColor={colors.borderColor}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Terms and Conditions Drawer */}
        <PolicyDrawer
          visible={showTermsDrawer}
          onClose={() => {
            // Note: The PolicyDrawer component handles the close logic internally
            // This just updates the local state after the drawer decides to close
            setShowTermsDrawer(false)
          }}
          title="Terms and Conditions"
          sections={termsData}
          acceptButtonLabel="Accept Terms and Conditions"
          hasBeenAccepted={readTerms}
          onAccept={async () => {
            setReadTerms(true)
            setShowTermsDrawer(false)

            // Check if privacy needs to be read next
            if (!readPrivacy) {
              handlePrivacyPress()
            } else {
              // Both terms and privacy read, update the field and save if ready
              updateField('policiesAccepted', true)

              // If both email and phone are verified, complete the save
              if (isEmailVerified && isPhoneVerified) {
                try {
                  await performSave()
                } catch (error) {
                  console.error('Failed to save after accepting terms:', error)
                  // performSave already shows an Alert on failure
                }
              }
            }
          }}
          requireScrollToEnd={true}
        />

        {/* Privacy Policy Drawer */}
        <PolicyDrawer
          visible={showPrivacyDrawer}
          onClose={() => {
            // Note: The PolicyDrawer component handles the close logic internally
            // This just updates the local state after the drawer decides to close
            setShowPrivacyDrawer(false)
          }}
          title="Privacy Policy"
          sections={privacyData}
          acceptButtonLabel="Accept Privacy Policy"
          hasBeenAccepted={readPrivacy}
          onAccept={async () => {
            setReadPrivacy(true)
            setShowPrivacyDrawer(false)

            // Now both terms and privacy are read, update the field and save if ready
            updateField('policiesAccepted', true)

            // If both email and phone are verified, complete the save
            if (isEmailVerified && isPhoneVerified) {
              try {
                await performSave()
              } catch (error) {
                console.error('Failed to save after accepting privacy:', error)
                // performSave already shows an Alert on failure
              }
            }
          }}
          requireScrollToEnd={true}
        />

        {/* Verification Drawer */}
        <DrawerOverlay
          visible={showVerificationDrawer}
          onClose={() => setShowVerificationDrawer(false)}
          title={
            verificationStep === 'email'
              ? 'Verify Email Address'
              : verificationStep === 'emailSuccess'
                ? 'Email Verified'
                : 'Verify Phone Number'
          }
          width="100%"
        >
          <View style={styles.verificationContent}>
            {verificationStep === 'email' && (
              <View>
                {!showEmailVerificationCode ? (
                  <View>
                    <Text style={styles.verificationDescription}>Please verify your email address.</Text>

                    {/* Edit Button - Pencil Icon */}
                    <View style={styles.editButtonContainer}>
                      <TouchableOpacity onPress={isEditing ? handleCancelEdit : handleEdit} style={styles.pencilButton}>
                        {isEditing ? (
                          <Text style={styles.cancelIcon}>✕</Text>
                        ) : (
                          <PencilIcon size={20} color={colors.primaryColor} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Name Field */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Name:</Text>
                      {!isEditing ? (
                        <Text style={styles.fieldDisplayText}>{formData.name}</Text>
                      ) : (
                        <TextField
                          value={tempName}
                          onChangeText={setTempName}
                          style={styles.fieldEditInput}
                          placeholderTextColor={text.muted}
                          color={text.primary}
                          placeholder="Enter your name"
                        />
                      )}
                    </View>

                    {/* Email Field */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Email Address:</Text>
                      {!isEditing ? (
                        <Text style={styles.fieldDisplayText}>{formData.email}</Text>
                      ) : (
                        <TextField
                          value={tempEmail}
                          onChangeText={setTempEmail}
                          style={styles.fieldEditInput}
                          placeholderTextColor={text.muted}
                          color={text.primary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          spellCheck={false}
                          placeholder="Enter your email"
                        />
                      )}
                    </View>

                    <Button
                      label="Verify Email Address"
                      onPress={handleVerifyEmail}
                      disabled={
                        isSendingEmailCode ||
                        (!isEditing && (!formData.email || !formData.name)) ||
                        (isEditing && (!tempEmail || !tempName))
                      }
                      loading={isSendingEmailCode}
                      variant="primary"
                      size="medium"
                      style={styles.verificationButton}
                    />
                  </View>
                ) : (
                  <View>
                    <Text style={styles.verificationCodeTitle}>Enter Verification Code</Text>
                    <Text style={styles.verificationCodeDescription}>We've sent a 6-digit code to your email</Text>

                    {/* Display email address as read-only */}
                    <View style={styles.emailDisplayContainer}>
                      <Text style={styles.emailDisplayLabel}>Email:</Text>
                      <Text style={styles.emailDisplayValue}>{emailBeingVerified}</Text>
                    </View>

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

                    <View style={styles.verificationButtonContainer}>
                      <Button
                        label={emailVerificationCode.length === CELL_COUNT ? 'Verify' : 'Resend Code'}
                        onPress={
                          emailVerificationCode.length === CELL_COUNT ? handleVerifyEmailCode : handleResendEmailCode
                        }
                        disabled={
                          isSendingEmailCode ||
                          isVerifyingEmailCode ||
                          (emailVerificationCode.length > 0 && emailVerificationCode.length < CELL_COUNT)
                        }
                        loading={
                          emailVerificationCode.length === CELL_COUNT ? isVerifyingEmailCode : isSendingEmailCode
                        }
                        variant="secondary"
                        size="small"
                        style={styles.verificationButtonHalf}
                      />
                      <Button
                        label="Cancel"
                        onPress={() => {
                          setShowEmailVerificationCode(false)
                          setEmailVerificationCode('')
                          setEmailVerificationAttempts(0)
                          setIsEmailVerificationLocked(false)
                          setShowVerificationDrawer(false)
                        }}
                        disabled={isSendingEmailCode || isVerifyingEmailCode}
                        variant="outline"
                        size="small"
                        style={styles.verificationButtonHalf}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {verificationStep === 'emailSuccess' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.successTitle}>Email Verified!</Text>
                <Text style={styles.successMessage}>Your email address has been successfully verified.</Text>
                {!isPhoneVerified && (
                  <Text style={styles.successNextStep}>Next, we'll verify your phone number...</Text>
                )}
              </View>
            )}

            {verificationStep === 'phone' && (
              <View>
                {!showVerificationCode ? (
                  <View>
                    <Text style={styles.verificationDescription}>
                      Now please verify your phone number to complete the process.
                    </Text>

                    {/* Edit Button - Pencil Icon */}
                    <View style={styles.editButtonContainer}>
                      <TouchableOpacity onPress={isEditing ? handleCancelEdit : handleEdit} style={styles.pencilButton}>
                        {isEditing ? (
                          <Text style={styles.cancelIcon}>✕</Text>
                        ) : (
                          <PencilIcon size={20} color={colors.primaryColor} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Phone Field */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Phone Number:</Text>
                      {!isEditing ? (
                        <Text style={styles.fieldDisplayText}>{formData.phoneNumber}</Text>
                      ) : (
                        <PhoneNumberInput
                          value={tempPhone}
                          onChangePhoneNumber={setTempPhone}
                          defaultCountry={DEFAULT_COUNTRY}
                          selectedCountries={getAllowedCountryCodes()}
                          placeholder={labels.phoneNumberPlaceholder}
                        />
                      )}
                    </View>

                    <Button
                      label="Verify Phone Number"
                      onPress={handleVerifyPhone}
                      disabled={isSendingCode || (!isEditing && !formData.phoneNumber) || (isEditing && !tempPhone)}
                      loading={isSendingCode}
                      variant="primary"
                      size="medium"
                      style={styles.verificationButton}
                    />
                  </View>
                ) : (
                  <View>
                    <Text style={styles.verificationCodeTitle}>Enter Verification Code</Text>
                    <Text style={styles.verificationCodeDescription}>We've sent a 6-digit code to your phone</Text>

                    {/* Display phone number as read-only */}
                    <View style={styles.emailDisplayContainer}>
                      <Text style={styles.emailDisplayLabel}>Phone:</Text>
                      <Text style={styles.emailDisplayValue}>{phoneBeingVerified}</Text>
                    </View>

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

                    <View style={styles.verificationButtonContainer}>
                      <Button
                        label={verificationCode.length === CELL_COUNT ? 'Verify' : 'Resend Code'}
                        onPress={verificationCode.length === CELL_COUNT ? handleVerifyCode : handleResendCode}
                        disabled={
                          isSendingCode ||
                          isVerifyingCode ||
                          (verificationCode.length > 0 && verificationCode.length < CELL_COUNT)
                        }
                        loading={verificationCode.length === CELL_COUNT ? isVerifyingCode : isSendingCode}
                        variant="secondary"
                        size="small"
                        style={styles.verificationButtonHalf}
                      />
                      <Button
                        label="Cancel"
                        onPress={() => {
                          setShowVerificationCode(false)
                          setVerificationCode('')
                          setVerificationAttempts(0)
                          setIsVerificationLocked(false)
                          setShowVerificationDrawer(false)
                        }}
                        disabled={isSendingCode || isVerifyingCode}
                        variant="outline"
                        size="small"
                        style={styles.verificationButtonHalf}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </DrawerOverlay>

        <Button
          label={labels.saveSettings}
          onPress={handleSave}
          disabled={isLoading || !isFormValid()}
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
    backgroundColor: surfaces.primary,
  },
  content: {
    padding: spacing.xl,
  },
  input: {
    backgroundColor: surfaces.input,
    borderWidth: 1,
    borderColor: inputs.borderColor,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  picker: {
    backgroundColor: surfaces.input,
    borderWidth: 1,
    borderColor: inputs.borderColor,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerError: {
    borderColor: inputs.borderColorError,
  },
  pickerText: {
    color: text.primary,
    fontSize: fontSize.md,
  },
  placeholderText: {
    color: text.muted,
  },
  pickerArrow: {
    color: text.muted,
    fontSize: fontSize.xs,
  },
  errorText: {
    color: colors.errorColor,
    fontSize: fontSize.sm,
    marginTop: spacing.xs + 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.lg - 1,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  codeFieldRoot: {
    marginTop: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    justifyContent: 'center',
  },
  codeCell: {
    width: 45,
    height: 55,
    lineHeight: 53,
    fontSize: 24,
    borderWidth: 2,
    borderColor: inputs.borderColor,
    backgroundColor: surfaces.input,
    borderRadius: borderRadius.lg,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs - 1,
  },
  codeCellFocused: {
    borderColor: colors.primaryColor,
  },
  codeCellText: {
    fontSize: 24,
    color: text.primary,
    textAlign: 'center',
  },
  infoIcon: {
    marginLeft: spacing.sm,
    padding: spacing.xs / 2,
  },
  infoIconText: {
    color: colors.primaryColor,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: surfaces.overlay,
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
    borderBottomColor: surfaces.modal,
  },
  popoverContent: {
    backgroundColor: surfaces.modal,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: inputs.borderColor,
    shadowColor: colors.backgroundColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  popoverText: {
    color: text.primary,
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  popoverCloseButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primaryColor,
    borderRadius: borderRadius.lg,
  },
  popoverCloseText: {
    color: colors.buttonTextColor,
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.semibold,
  },
  linkText: {
    color: colors.primaryColor,
    textDecorationLine: 'underline',
    fontSize: fontSize.sm,
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
  },
  termsText: {
    lineHeight: 20,
    fontSize: 16,
  },
  inlineLink: {
    alignSelf: 'flex-start',
  },
  verificationContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    flexGrow: 1,
  },
  verificationDescription: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: text.primary,
    textAlign: 'center',
    marginBottom: 30,
  },
  verificationCodeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm + 2,
  },
  verificationCodeDescription: {
    fontSize: fontSize.sm,
    color: text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emailDisplayContainer: {
    backgroundColor: surfaces.secondary,
    paddingHorizontal: spacing.md + 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm + 1,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailDisplayLabel: {
    fontSize: fontSize.sm,
    color: text.secondary,
    fontWeight: fontWeight.medium,
    marginRight: spacing.sm + 2,
  },
  emailDisplayValue: {
    fontSize: fontSize.sm,
    color: text.primary,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successIcon: {
    fontSize: 40,
    color: colors.backgroundColor,
    fontWeight: fontWeight.bold,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: text.primary,
    marginBottom: spacing.md + 1,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: fontSize.md,
    color: text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  successNextStep: {
    fontSize: fontSize.sm,
    color: text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verificationButton: {
    marginTop: spacing.sm + 2,
  },
  verificationButtonContainer: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.xl,
  },
  verificationButtonHalf: {
    flex: 1,
  },
  editButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  pencilButton: {
    padding: spacing.sm,
    backgroundColor: surfaces.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  pencilIcon: {
    fontSize: fontSize.lg,
    color: colors.primaryColor,
    transform: [{ rotate: '45deg' }],
  },
  cancelIcon: {
    fontSize: fontSize.lg,
    color: text.primary,
  },
  fieldContainer: {
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: inputs.backgroundColor,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: inputs.borderColor,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: text.secondary,
    marginBottom: spacing.sm,
  },
  fieldDisplayText: {
    fontSize: fontSize.md,
    color: text.primary,
    flex: 1,
  },
  fieldEditInput: {
    fontSize: fontSize.md,
    color: text.primary,
    backgroundColor: inputs.backgroundColor,
    borderWidth: 1,
    borderColor: inputs.borderColor,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editEmailButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: buttons.edit.backgroundColor,
    borderRadius: borderRadius.md,
  },
  editEmailButtonText: {
    fontSize: fontSize.sm,
    color: buttons.edit.textColor,
    fontWeight: fontWeight.medium,
  },
  emailEditContainer: {
    gap: spacing.sm + 2,
  },
  emailEditInput: {
    backgroundColor: inputs.backgroundColor,
    borderWidth: 1,
    borderColor: inputs.borderColor,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  emailEditButtons: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  emailSaveButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    backgroundColor: buttons.save.backgroundColor,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emailSaveButtonText: {
    fontSize: fontSize.sm,
    color: buttons.save.textColor,
    fontWeight: fontWeight.medium,
  },
  emailCancelButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    backgroundColor: buttons.cancel.backgroundColor,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emailCancelButtonText: {
    fontSize: fontSize.sm,
    color: buttons.cancel.textColor,
    fontWeight: fontWeight.medium,
  },
})

export default SettingsScreen
