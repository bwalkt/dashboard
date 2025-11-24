import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'

interface DrawerHeaderProps {
  title: string
  onClose: () => void
}

const DrawerHeader: React.FC<DrawerHeaderProps> = ({ title, onClose }) => {
  return (
    <View style={styles.header}>
      <Text text50 color={colors.textLightColor} style={styles.title}>
        {title}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
})

export default DrawerHeader
