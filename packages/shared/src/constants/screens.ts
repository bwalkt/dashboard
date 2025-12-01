export type ScreenType = {
  title: string
  screen: string
}
export function getScreens(screens: string[]): Record<string, ScreenType> {
  return screens.reduce(
    (acc, screen) => {
      const name =
        screen.charAt(0).toUpperCase() +
        screen
          .slice(1)
          .replace(/([A-Z])/g, ' $1')
          .trim()
      const title = name.replace(/ /g, '')
      acc[screen] = {
        title: title,
        screen: name,
      } as ScreenType
      return acc
    },
    {} as Record<string, ScreenType>,
  )
}
