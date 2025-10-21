import { useColorScheme } from 'react-native'
import { type Appearance, Appearances } from '../types'
import { ZStorage } from './store'

const STORE = 'theme'
export class ThemeStoreClass extends ZStorage {
  isDark: boolean = true
  constructor() {
    super(STORE)
  }

  setAppearance(appearance: Appearance) {
    if (appearance === Appearances.system) {
      const colorScheme = useColorScheme()
      const isLightMode =
        appearance === Appearances.light || (appearance === undefined && colorScheme === Appearances.light)
      const isDarkMode = !isLightMode
      this.isDark = isDarkMode
    } else {
      this.isDark = !(appearance === Appearances.light)
    }
    this.setItem({ key: 'appearance', data: appearance })
  }
}
export const ThemeStore = new ZStorage(STORE)
