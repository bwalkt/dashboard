export const screens = ['settings', 'connectDevices', 'connections', 'timeline', 'faq']
type ScreenType = {
  title: string
  screen: string
}
export const Screens = screens.reduce(
  (acc, screen) => {
    const name =
      screen.charAt(0).toUpperCase() +
      screen
        .slice(1)
        .replace(/([A-Z])/g, ' $1')
        .trim()
    const title = name.replaceAll(' ', '')
    acc[screen] = {
      title: title,
      screen: name,
    } as ScreenType
    return acc
  },
  {} as Record<string, ScreenType>,
)
export type Screen = keyof typeof Screens

export const initialScreen: Screen = Screens.connections.screen
