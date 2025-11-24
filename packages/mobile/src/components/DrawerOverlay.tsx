import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
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

  // Scrollbar state
  const [contentHeight, setContentHeight] = useState(0)
  const [scrollViewHeight, setScrollViewHeight] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  const scrollIndicatorSize =
    scrollViewHeight > 0 && contentHeight > scrollViewHeight
      ? (scrollViewHeight * scrollViewHeight) / contentHeight
      : scrollViewHeight

  const scrollIndicatorPosition =
    scrollViewHeight > 0 && contentHeight > scrollViewHeight
      ? (scrollY / (contentHeight - scrollViewHeight)) * (scrollViewHeight - scrollIndicatorSize)
      : 0

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
      <View style={styles.modalContainer}>
        {/* Background overlay for closing */}
        <Pressable style={styles.backgroundOverlay} onPress={onClose} />

        <Animated.View
          style={[
            styles.drawerContainer,
            {
              paddingTop: safeAreaInsets.top,
              width: width as any,
              ...(maxWidth && { maxWidth: maxWidth }),
            },
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
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

          <View style={styles.scrollContainer}>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEnabled={true}
              onScroll={event => {
                setScrollY(event.nativeEvent.contentOffset.y)
              }}
              onContentSizeChange={(width, height) => {
                setContentHeight(height)
              }}
              onLayout={event => {
                setScrollViewHeight(event.nativeEvent.layout.height)
              }}
              scrollEventThrottle={16}
            >
              {children}
            </ScrollView>

            {/* Custom Scrollbar */}
            {contentHeight > scrollViewHeight && (
              <View style={styles.scrollBarContainer}>
                <View
                  style={[
                    styles.scrollBar,
                    {
                      height: scrollIndicatorSize,
                      transform: [{ translateY: scrollIndicatorPosition }],
                    },
                  ]}
                />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
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
    width: '100%',
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
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollBarContainer: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  scrollBar: {
    position: 'absolute',
    right: 0,
    width: 4,
    backgroundColor: colors.primaryColor || '#007AFF',
    borderRadius: 2,
    minHeight: 20,
  },
})

export default DrawerOverlay
