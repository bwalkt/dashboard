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
  hasBeenAccepted?: boolean
}

const PolicyDrawer: React.FC<PolicyDrawerProps> = ({
  visible,
  onClose,
  onAccept,
  title,
  sections,
  acceptButtonLabel = 'Accept',
  requireScrollToEnd = true,
  hasBeenAccepted = false,
}) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const [viewHeight, setViewHeight] = useState(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showScrollReminder, setShowScrollReminder] = useState(false)

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewHeight(event.nativeEvent.layout.height)
  }

  // Reset scroll state when drawer opens
  useEffect(() => {
    if (visible) {
      setHasScrolledToEnd(false)
      setShowScrollReminder(false)
      
      // If no sections, enable button immediately
      if (sections.length === 0) {
        setHasScrolledToEnd(true)
      } else if (requireScrollToEnd) {
        // Start timeout to remind user to scroll after 10 seconds
        scrollTimeoutRef.current = setTimeout(() => {
          if (!hasScrolledToEnd) {
            setShowScrollReminder(true)
          }
        }, 10000) // 10 seconds
      }
    } else {
      // Clear timeout when drawer closes
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }
  }, [visible, sections.length, requireScrollToEnd])

  // Clear timeout when user scrolls to end
  useEffect(() => {
    if (hasScrolledToEnd && scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
      setShowScrollReminder(false)
    }
  }, [hasScrolledToEnd])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!requireScrollToEnd) return

    // Reset reminder modal if user starts scrolling
    if (showScrollReminder) {
      setShowScrollReminder(false)
    }

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

    // Use a timeout to check dimensions after layout is complete
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.measure((x, y, width, height, pageX, pageY) => {
          if (contentHeight <= height + 50) {
            setHasScrolledToEnd(true)
          }
        })
      }
    }, 100)
  }

  const handleClose = () => {
    if (!hasBeenAccepted && sections.length > 0) {
      Alert.alert(
        'Please Accept the Document',
        `Please read and accept the ${title.toLowerCase()} to continue.`,
        [
          { text: 'Continue Reading', style: 'default' },
          { text: 'Close Anyway', style: 'destructive', onPress: () => {
            // Force close without validation
            onClose()
          }}
        ]
      )
      return // Don't close automatically - wait for user choice
    }
    // Only close if validation passes or no validation needed
    onClose()
  }

  const handleAccept = () => {
    if (requireScrollToEnd && !hasScrolledToEnd) {
      Alert.alert('Please Read Policy', 'Please scroll to the end of the policy before accepting.')
      return
    }
    onAccept()
  }

  // Show scroll reminder alert
  useEffect(() => {
    if (showScrollReminder) {
      Alert.alert(
        'Reminder',
        `Please scroll to the end of the ${title.toLowerCase()} to enable the accept button.`,
        [
          { 
            text: 'OK', 
            onPress: () => setShowScrollReminder(false)
          }
        ]
      )
    }
  }, [showScrollReminder, title])

  return (
    <DrawerOverlay visible={visible} onClose={handleClose} title={title} width="100%">
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
