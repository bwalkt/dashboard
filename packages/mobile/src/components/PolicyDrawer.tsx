import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import type { PrivacySection } from '../services/privacy'
import type { TermsSection } from '../services/terms'
import { borderRadius, fontSize, fontWeight, spacing, text } from '../theme'
import Button from './Button'
import DrawerOverlay from './DrawerOverlay'

interface PolicyDrawerProps {
  visible: boolean
  onClose: () => void
  onAccept: () => void
  title: string
  sections: TermsSection[] | PrivacySection[]
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

  // Reset scroll state when drawer opens
  useEffect(() => {
    if (visible) {
      setHasScrolledToEnd(false)
      // Check content size after a delay to see if scrolling is needed
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.measure((x, y, width, height, pageX, pageY) => {
            // If content is very short or there are no sections, enable button
            if (sections.length === 0 || height < 200) {
              setHasScrolledToEnd(true)
            }
          })
        }
      }, 100)
    }
  }, [visible, sections.length])

  const handleScroll = (event: any) => {
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
