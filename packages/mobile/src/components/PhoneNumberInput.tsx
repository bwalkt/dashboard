import type React from 'react'
import PhoneInput from 'react-native-international-phone-number'
import { borderRadius, fontSize, inputs, surfaces, text } from '../theme'

interface PhoneNumberInputProps {
  value: string
  onChangePhoneNumber: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  defaultCountry?: string
  selectedCountries?: string[]
  hasError?: boolean
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChangePhoneNumber,
  onBlur,
  placeholder = 'Enter your phone number',
  defaultCountry = 'US',
  selectedCountries = ['US', 'GB', 'CA', 'AU'],
  hasError = false,
}) => {
  return (
    <PhoneInput
      value={value}
      onChangePhoneNumber={onChangePhoneNumber}
      onBlur={onBlur}
      defaultCountry={defaultCountry}
      selectedCountries={selectedCountries}
      placeholder={placeholder}
      phoneInputStyles={{
        container: {
          backgroundColor: surfaces.input,
          borderWidth: 1,
          borderColor: hasError ? inputs.borderColorError : inputs.borderColor,
          borderRadius: borderRadius.lg,
        },
        flagContainer: {
          backgroundColor: surfaces.input,
          borderTopLeftRadius: borderRadius.lg,
          borderBottomLeftRadius: borderRadius.lg,
        },
        flag: {},
        caret: {
          color: text.muted,
          fontSize: fontSize.md,
        },
        divider: {
          backgroundColor: inputs.borderColor,
        },
        callingCode: {
          color: text.primary,
          fontSize: fontSize.md,
        },
        input: {
          color: text.primary,
          fontSize: fontSize.md,
        },
      }}
    />
  )
}

export default PhoneNumberInput
