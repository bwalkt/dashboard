import { DrawerActions, type NavigationProp } from '@react-navigation/native'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
}

interface HeaderProps {
  title: string
  navigation?: NavigationProp<DrawerParamList>
  onFAQPress?: () => void
}

const Header: React.FC<HeaderProps> = ({ title, navigation, onFAQPress }) => {
  const openDrawer = () => {
    navigation?.dispatch(DrawerActions.openDrawer())
  }

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
        <Text style={styles.hamburgerIcon}>☰</Text>
      </TouchableOpacity>
      <Text text50 color={text.primary} style={styles.title}>
        {title}
      </Text>
      {onFAQPress && (
        <TouchableOpacity onPress={onFAQPress} style={styles.faqButton}>
          <Text style={styles.faqIcon}>?</Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
  },
  menuButton: {
    marginRight: spacing.lg - 1,
    padding: spacing.xs + 1,
  },
  hamburgerIcon: {
    fontSize: fontSize.xl,
    color: text.primary,
  },
  title: {
    flex: 1,
    marginLeft: spacing.lg - 1,
  },
  faqButton: {
    padding: spacing.xs + 1,
  },
  faqIcon: {
    fontSize: fontSize.md,
    color: text.primary,
  },
})

export default Header
