import { colors } from '@pzero/shared/theme'
import { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'

interface SplashScreenProps {
  onFinish: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Image
          source={require('../../../shared/src/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 128,
    height: 128,
  },
})

export default SplashScreen
