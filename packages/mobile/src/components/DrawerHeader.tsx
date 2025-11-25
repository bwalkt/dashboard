import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

interface DrawerHeaderProps {
  title: string
  onClose: () => void
}

const DrawerHeader: React.FC<DrawerHeaderProps> = ({ title, onClose }) => {
  return (
    <View style={styles.header}>
      <Text text50 color={text.primary} style={styles.title}>
        {title}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        accessibilityLabel="Close drawer"
        accessibilityRole="button"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs + 1,
  },
  closeIcon: {
    fontSize: fontSize.xl,
    color: text.primary,
  },
})

export default DrawerHeader
