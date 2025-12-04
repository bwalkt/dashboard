// @ts-nocheck
import { useState } from 'react'
import { useColorScheme } from 'react-native'

import type { Appearance, DesignAppearance } from '../types'

const LIGHT: DesignAppearance = 'Light'
const DARK: DesignAppearance = 'Dark'
const SYSTEM: Appearance = 'system'

const appearanceToUI: Record<Appearance, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const appearanceUIToInternal: Record<string, Appearance> = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
}

export function useAppearance() {
  const systemAppearance = useColorScheme()
  const [appearance, setAppearance] = useState<Appearance>(SYSTEM)

  const isAppearanceSystem = appearance === SYSTEM

  const designAppearance = isAppearanceSystem
    ? systemAppearance === 'dark'
      ? DARK
      : LIGHT
    : appearance === 'dark'
      ? DARK
      : LIGHT

  const setDesignAppearance = (newAppearance: Appearance) => {
    setAppearance(newAppearance)
  }

  return {
    appearance,
    designAppearance,
    systemAppearance,
    isAppearanceSystem,
    setDesignAppearance,
    appearanceToUI,
    appearanceUIToInternal,
  }
}
