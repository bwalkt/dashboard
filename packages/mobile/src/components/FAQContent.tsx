import { api } from '@pzero/shared/api'
import type React from 'react'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

interface FAQ {
  question: string
  answer: string
}

interface FAQData {
  title: string
  faqs: FAQ[]
}

const FAQContent: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<FAQData>('/public/faq')
      setFaqs(response)
    } catch (err: any) {
      console.error('Error fetching FAQs:', err)
      setError('Failed to load FAQs. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryColor} />
        <Text text70 color={text.secondary} marginT-10>
          Loading FAQs...
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text text70 color={colors.errorColor} center>
          {error}
        </Text>
        <TouchableOpacity onPress={fetchFAQs} style={styles.retryButton}>
          <Text text70 color={colors.primaryColor}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View>
      {(faqs?.faqs ?? []).map((faq, index) => (
        <TouchableOpacity key={index} onPress={() => toggleExpanded(index)} style={styles.faqItem} activeOpacity={0.7}>
          <View style={styles.questionContainer}>
            <Text text70 color={text.primary} style={styles.question}>
              {faq.question}
            </Text>
            <Text style={styles.expandIcon}>{expandedItems.has(index) ? '−' : '+'}</Text>
          </View>

          {expandedItems.has(index) && (
            <View style={styles.answerContainer}>
              <Text text80 color={text.secondary} style={styles.answer}>
                {faq.answer}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  retryButton: {
    marginTop: spacing.xl,
    padding: spacing.sm + 2,
  },
  faqItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  question: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium as any,
    lineHeight: 22,
    marginRight: spacing.sm + 2,
  },
  expandIcon: {
    fontSize: fontSize.xl,
    color: colors.primaryColor,
    fontWeight: fontWeight.bold as any,
    width: 24,
    textAlign: 'center' as const,
  },
  answerContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
  },
  answer: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: text.secondary,
  },
})

export default FAQContent
