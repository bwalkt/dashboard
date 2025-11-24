import { colors } from '@pzero/shared/theme'
import { DrawerActions, type NavigationProp } from '@react-navigation/native'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'

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
      <Text text50 color={colors.textLightColor} style={styles.title}>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },
  menuButton: {
    marginRight: 15,
    padding: 5,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  title: {
    flex: 1,
    marginLeft: 15,
  },
  faqButton: {
    padding: 5,
  },
  faqIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
})

export default Header
