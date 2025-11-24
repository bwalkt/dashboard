import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View } from 'react-native-ui-lib'

interface DrawerOverlayProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string | number
  maxWidth?: number
}

const DrawerOverlay: React.FC<DrawerOverlayProps> = ({
  visible,
  onClose,
  title,
  children,
  width = '100%',
  maxWidth = undefined,
}) => {
  const safeAreaInsets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              paddingTop: safeAreaInsets.top,
              transform: [{ translateX: slideAnim }],
              width: width,
              ...(maxWidth && { maxWidth: maxWidth }),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {title && (
            <View style={styles.header}>
              <Text text40 color={colors.textLightColor}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
})

export default DrawerOverlay
