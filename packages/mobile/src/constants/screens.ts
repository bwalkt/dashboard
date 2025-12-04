export const screens = ['settings', 'connectDevices', 'connections', 'timeline', 'faq']

import { getScreens } from '@pzero/shared/constants'

export const Screens = getScreens(screens)
export type Screen = keyof typeof Screens
export const initialScreen: Screen = Screens.connections.screen
