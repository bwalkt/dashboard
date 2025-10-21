import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native'
import { Text } from 'react-native-ui-lib'

interface ButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  style?: ViewStyle
}

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]]

    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary)
        break
      case 'secondary':
        baseStyle.push(styles.secondary)
        break
      case 'outline':
        baseStyle.push(styles.outline)
        break
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabled)
    }

    if (style) {
      baseStyle.push(style)
    }

    return baseStyle
  }

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]]

    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryText)
        break
      case 'secondary':
        baseStyle.push(styles.secondaryText)
        break
      case 'outline':
        baseStyle.push(styles.outlineText)
        break
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledText)
    }

    return baseStyle
  }

  return (
    <TouchableOpacity style={getButtonStyle()} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? colors.primaryColor : colors.buttonTextColor} />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Sizes
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
  },

  // Variants
  primary: {
    backgroundColor: colors.primaryColor,
  },
  secondary: {
    backgroundColor: colors.secondaryColor,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primaryColor,
  },

  // States
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },

  // Text variants
  primaryText: {
    color: colors.buttonTextColor,
  },
  secondaryText: {
    color: colors.buttonTextColor,
  },
  outlineText: {
    color: colors.primaryColor,
  },
  disabledText: {
    opacity: 0.7,
  },
})

export default Button
