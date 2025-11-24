import { api } from '@pzero/shared/api'
import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'

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
      const response = await api.get<FAQData>('/faq')
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
        <Text text70 color={colors.textDarkColor} marginT-10>
          Loading FAQs...
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text text70 color="#ff4444" center>
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
      {faqs?.faqs.map((faq, index) => (
        <TouchableOpacity key={index} onPress={() => toggleExpanded(index)} style={styles.faqItem} activeOpacity={0.7}>
          <View style={styles.questionContainer}>
            <Text text70 color={colors.textLightColor} style={styles.question}>
              {faq.question}
            </Text>
            <Text style={styles.expandIcon}>{expandedItems.has(index) ? '−' : '+'}</Text>
          </View>

          {expandedItems.has(index) && (
            <View style={styles.answerContainer}>
              <Text text80 color={colors.textDarkColor} style={styles.answer}>
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
    marginTop: 20,
    padding: 10,
  },
  faqItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginRight: 10,
  },
  expandIcon: {
    fontSize: 20,
    color: colors.primaryColor || '#007AFF',
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  answerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  answer: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDarkColor || '#999',
  },
})

export default FAQContent
