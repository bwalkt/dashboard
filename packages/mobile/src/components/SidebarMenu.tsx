import { colors } from '@pzero/shared/theme'
import { type DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View } from 'react-native-ui-lib'

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
        <Text text40 color={colors.textLightColor} marginB-20>
          P-Zero
        </Text>
      </View>

      <View style={styles.menuItems}>
        <TouchableOpacity style={styles.menuItem} onPress={navigateToHome}>
          <Text text60 color={colors.textLightColor}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToConnectDevice}>
          <Text text60 color={colors.textLightColor}>
            Connect Device
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToEndpoints}>
          <Text text60 color={colors.textLightColor}>
            Endpoints
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={navigateToSettings}>
          <Text text60 color={colors.textLightColor}>
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
    backgroundColor: colors.backgroundDarkColor || '#1a1a1a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor || '#333',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor || '#333',
  },
})

export default SidebarMenu
