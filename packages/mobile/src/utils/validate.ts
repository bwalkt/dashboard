import { Platform } from 'react-native'

function isValidEmail(email: string): boolean {
  // A common regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
export { isValidEmail }
export const isAndroid = (): boolean => {
  return Platform.OS === 'android'
}
export const isIOS = (): boolean => {
  return Platform.OS === 'ios'
}
