import { colors as sharedColors } from '@pzero/shared/theme'

export const colors = {
  ...sharedColors,
}

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.25rem', // 20px
  xxl: '1.5rem', // 24px
  xxxl: '2rem', // 32px
}

export const borderRadius = {
  xs: '0.125rem', // 2px
  sm: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
}

export const buttons = {
  primary: {
    backgroundColor: colors.primaryColor,
    color: colors.buttonTextColor,
    borderRadius: borderRadius.lg,
  },
  secondary: {
    backgroundColor: colors.cardBackgroundColor,
    color: colors.textLightColor,
    borderColor: colors.borderColor,
    borderRadius: borderRadius.lg,
  },
  outline: {
    backgroundColor: 'transparent',
    color: colors.textLightColor,
    borderColor: colors.borderColor,
    borderRadius: borderRadius.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.textDarkColor,
    borderRadius: borderRadius.lg,
  },
  sizes: {
    small: { minHeight: '2.25rem', padding: `${spacing.sm} ${spacing.md}` },
    medium: { minHeight: '2.75rem', padding: `${spacing.md} ${spacing.lg}` },
    large: { minHeight: '3.25rem', padding: `${spacing.lg} ${spacing.xl}` },
  },
}

export const surfaces = {
  primary: colors.backgroundColor,
  secondary: colors.cardBackgroundColor,
  modal: '#2a2a2a',
  input: colors.cardBackgroundColor,
  overlay: 'rgba(0, 0, 0, 0.5)',
}

export const text = {
  primary: colors.textLightColor,
  secondary: colors.textDarkColor,
  muted: '#666',
  inverse: colors.white,
}

export const gradients = {
  primary: `linear-gradient(135deg, ${colors.backgroundColor} 0%, #1a1a2e 100%)`,
  secondary: `linear-gradient(135deg, #1a1a2e 0%, ${colors.cardBackgroundColor} 100%)`,
  accent: `linear-gradient(135deg, ${colors.primaryColor} 0%, ${colors.secondaryColor} 100%)`,
}

// CSS-in-JS style helpers
export const getButtonStyles = (variant: keyof typeof buttons, size: keyof typeof buttons.sizes = 'medium') => {
  const baseButton = buttons[variant as keyof Omit<typeof buttons, 'sizes'>] || buttons.primary
  const sizeStyles = buttons.sizes[size]

  return {
    ...baseButton,
    ...sizeStyles,
    border: (baseButton as any).borderColor ? `1px solid ${(baseButton as any).borderColor}` : 'none',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
  }
}

export const getCardStyles = () => ({
  backgroundColor: surfaces.secondary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: borderRadius.lg,
  color: text.primary,
})

export const getGradientBackground = (gradient: keyof typeof gradients = 'primary') => ({
  background: gradients[gradient],
})
