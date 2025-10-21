import { colors } from '@pzero/shared/theme'
import { DrawerActions, type NavigationProp } from '@react-navigation/native'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View } from 'react-native-ui-lib'
import Button from '../components/Button'
import { labels } from '../constants/labels'
import { SettingsStore } from '../stores/settings'

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
}

interface HomeScreenProps {
  navigation: NavigationProp<DrawerParamList>
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const isVerified = SettingsStore.isVerified

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer())
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Text text60 color={colors.textLightColor}>
            {labels.menuIcon}
          </Text>
        </TouchableOpacity>
        <Text text50 color={colors.textLightColor}>
          {labels.appName}
        </Text>
      </View>

      <View center flex>
        <Text text40 marginB-20 color={colors.textLightColor}>
          {labels.welcomeTitle}
        </Text>
        <Text text70 marginB-30 color={colors.textDarkColor}>
          {labels.welcomeSubtitle}
        </Text>
        <Button
          label={labels.getStartedButton}
          variant="primary"
          size="medium"
          onPress={() => (!isVerified ? navigation.navigate('Settings') : navigation.navigate('ConnectDevice'))}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    marginRight: 15,
    padding: 5,
  },
})

export default HomeScreen
