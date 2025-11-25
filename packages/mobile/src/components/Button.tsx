import type React from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native'
import { Text } from 'react-native-ui-lib'
import { borderRadius, buttons, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

interface ButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
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
      case 'ghost':
        baseStyle.push(styles.ghost)
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
      case 'ghost':
        baseStyle.push(styles.ghostText)
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
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primaryColor : buttons.primary.textColor}
        />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Sizes
  small: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm,
    minHeight: buttons.sizes.small.minHeight,
  },
  medium: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: buttons.sizes.medium.minHeight,
  },
  large: {
    paddingHorizontal: spacing.xl + 4,
    paddingVertical: spacing.lg,
    minHeight: buttons.sizes.large.minHeight,
  },

  // Variants
  primary: {
    backgroundColor: buttons.primary.backgroundColor,
  },
  secondary: {
    backgroundColor: buttons.secondary.backgroundColor,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primaryColor,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // States
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  smallText: {
    fontSize: fontSize.sm,
  },
  mediumText: {
    fontSize: fontSize.md,
  },
  largeText: {
    fontSize: fontSize.lg,
  },

  // Text variants
  primaryText: {
    color: buttons.primary.textColor,
  },
  secondaryText: {
    color: buttons.secondary.textColor,
  },
  outlineText: {
    color: colors.primaryColor,
  },
  ghostText: {
    color: text.secondary,
  },
  disabledText: {
    opacity: 0.7,
  },
})

export default Button
