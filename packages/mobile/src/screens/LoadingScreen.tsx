import { colors } from '@pzero/shared/theme'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { View } from 'react-native-ui-lib'

/**
 * Render a full-screen centered loading screen with a large themed activity indicator.
 *
 * Renders a View that fills the screen, centers its contents, and displays a large ActivityIndicator using the theme's primary color on the themed background.
 *
 * @returns A JSX element containing the centered activity indicator.
 */
export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})
