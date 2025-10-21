import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-ui-lib'
import AnimatedBackButton from './AnimatedBackButton'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  showBackButton?: boolean
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, showBackButton = false }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {showBackButton && onBack ? (
          <AnimatedBackButton onPress={onBack} style={styles.backButtonHeader} />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text text60 color={colors.textLightColor} style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButtonHeader: {
    padding: 10,
    minWidth: 80,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 80,
  },
})

export default ScreenHeader
