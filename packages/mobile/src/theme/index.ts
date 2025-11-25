import { colors as sharedColors } from '@pzero/shared/theme'

export const colors = {
  ...sharedColors,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
}

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
}

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

export const buttons = {
  primary: {
    backgroundColor: colors.primaryColor,
    textColor: colors.buttonTextColor,
  },
  secondary: {
    backgroundColor: colors.cardBackgroundColor,
    textColor: colors.textLightColor,
    borderColor: colors.borderColor,
  },
  sizes: {
    small: { minHeight: 36 },
    medium: { minHeight: 44 },
    large: { minHeight: 52 },
  },
  edit: {
    backgroundColor: colors.primaryColor,
    textColor: colors.buttonTextColor,
  },
  save: {
    backgroundColor: colors.primaryColor,
    textColor: colors.buttonTextColor,
  },
  cancel: {
    backgroundColor: colors.borderColor,
    textColor: colors.textLightColor,
  },
}

export const inputs = {
  backgroundColor: colors.cardBackgroundColor,
  borderColor: colors.borderColor,
  borderColorError: colors.errorColor,
  textColor: colors.textLightColor,
  placeholderColor: colors.textDarkColor,
}

export const status = {
  success: '#4CAF50',
  verified: colors.statusVerified,
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
