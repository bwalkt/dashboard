import type React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'
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
        <Text text60 color={text.primary} style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButtonHeader: {
    padding: spacing.sm + 2,
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
