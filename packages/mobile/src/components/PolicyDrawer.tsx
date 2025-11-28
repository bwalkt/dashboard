import type { Section } from '@pzero/shared/pzero'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, fontSize, fontWeight, spacing, text } from '../theme'
import Button from './Button'
import DrawerOverlay from './DrawerOverlay'

interface PolicyDrawerProps {
  visible: boolean
  onClose: () => void
  onAccept: () => void
  title: string
  sections: Section[]
  acceptButtonLabel?: string
  requireScrollToEnd?: boolean
}

const PolicyDrawer: React.FC<PolicyDrawerProps> = ({
  visible,
  onClose,
  onAccept,
  title,
  sections,
  acceptButtonLabel = 'Accept',
  requireScrollToEnd = true,
}) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const [viewHeight, setViewHeight] = useState(0)

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewHeight(event.nativeEvent.layout.height)
  }

  // Reset scroll state when drawer opens
  useEffect(() => {
    if (visible) {
      setHasScrolledToEnd(false)
      // If no sections, enable button immediately
      if (sections.length === 0) {
        setHasScrolledToEnd(true)
      }
    }
  }, [visible, sections.length])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!requireScrollToEnd) return

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingToBottom = 50 // Increased threshold
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom

    // Also check if content is shorter than the scroll view (no scrolling needed)
    const contentFitsInView = contentSize.height <= layoutMeasurement.height

    if ((isCloseToBottom || contentFitsInView) && !hasScrolledToEnd) {
      setHasScrolledToEnd(true)
    }
  }

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    if (!requireScrollToEnd) return

    // If content fits in the scroll view, enable the button immediately
    if (viewHeight > 0 && contentHeight <= viewHeight + 50) {
      setHasScrolledToEnd(true)
    }
  }

  const handleAccept = () => {
    if (requireScrollToEnd && !hasScrolledToEnd) {
      Alert.alert('Please Read Policy', 'Please scroll to the end of the policy before accepting.')
      return
    }
    onAccept()
  }

  return (
    <DrawerOverlay visible={visible} onClose={onClose} title={title} width="100%">
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
        onLayout={handleLayout}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          {/* Accept Button at the end of content */}
          <View style={styles.buttonContainer}>
            <Button
              label={acceptButtonLabel}
              onPress={handleAccept}
              variant="primary"
              size="medium"
              style={styles.acceptButton}
              disabled={requireScrollToEnd && !hasScrolledToEnd}
            />
            {requireScrollToEnd && !hasScrolledToEnd && (
              <Text style={styles.scrollHint}>Please scroll to the end to enable the accept button</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </DrawerOverlay>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    flexGrow: 1,
  },
  section: {
    marginBottom: spacing.xl + 5,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: text.primary,
    marginBottom: spacing.sm + 2,
  },
  sectionContent: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: text.primary,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  acceptButton: {
    marginBottom: 0,
  },
  scrollHint: {
    fontSize: fontSize.sm,
    color: text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
})

export default PolicyDrawer
