import { type DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

const SidebarMenu: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
  const safeAreaInsets = useSafeAreaInsets()

  const navigateToSettings = () => {
    navigation.navigate('Settings')
  }

  const navigateToHome = () => {
    navigation.navigate('Home')
  }

  const navigateToConnectDevice = () => {
    navigation.navigate('ConnectDevice')
  }

  const navigateToEndpoints = () => {
    navigation.navigate('Endpoints')
  }

  return (
    <DrawerContentScrollView style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.header}>
        <Text text40 color={text.primary} marginB-20>
          P-Zero
        </Text>
      </View>

      <View style={styles.menuItems}>
        <TouchableOpacity style={styles.menuItem} onPress={navigateToHome}>
          <Text text60 color={text.primary}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToConnectDevice}>
          <Text text60 color={text.primary}>
            Manage Devices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToEndpoints}>
          <Text text60 color={text.primary}>
            Endpoints
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToSettings}>
          <Text text60 color={text.primary}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.primary,
  },
  header: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  menuItems: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  menuItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
})

export default SidebarMenu
