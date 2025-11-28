import { api } from '@pzero/shared/api'
import type { Section, SectionResponse } from '@pzero/shared/pzero'

export type ContentType = 'terms' | 'privacy'

export const fetchContent = async (type: ContentType): Promise<SectionResponse> => {
  try {
    console.log(`Attempting to fetch ${type} from /${type} endpoint...`)
    const response = await api.get(`/${type}`)
    console.log(`${type} API response:`, response)

    // Parse the response content into structured sections
    const content = response

    // If response is already structured with sections, return it
    if (content && content.sections && Array.isArray(content.sections)) {
      return content
    }

    // If response is a string, parse it into JSON sections
    if (typeof content === 'string') {
      return parseContent(content, type)
    }

    // If response is an object but not in the expected format, throw error
    if (typeof content === 'object' && content !== null) {
      throw new Error(`Server returned unexpected format for ${type}`)
    }

    // Fallback to default content
    throw new Error(`Invalid response format from ${type} API`)
  } catch (error) {
    console.error(`Failed to fetch ${type} from API:`, error)

    // In development, throw the error instead of using fallback
    if (__DEV__) {
      throw new Error(`${type} API endpoint not available: ${error}`)
    }

    // Production fallback
    throw error
  }
}

const parseContent = (content: string, type: ContentType): SectionResponse => {
  const sections: Section[] = []
  const sectionHeaders = content.match(/##([^#]+)##/g) || []

  if (sectionHeaders.length === 0) {
    return {
      sections: [
        {
          title: type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy',
          content: content,
        },
      ],
    }
  }

  let currentIndex = 0

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i]
    const title = header.replace(/##/g, '').trim()

    const nextHeader = sectionHeaders[i + 1]
    const startIndex = content.indexOf(header, currentIndex) + header.length
    const endIndex = nextHeader ? content.indexOf(nextHeader, startIndex) : content.length

    const sectionContent = content.substring(startIndex, endIndex).trim()

    sections.push({
      title,
      content: sectionContent,
    })

    currentIndex = endIndex
  }

  return { sections }
}

// Legacy function exports for backward compatibility
export const fetchTermsAndConditions = (): Promise<SectionResponse> => fetchContent('terms')
export const fetchPrivacyPolicy = (): Promise<SectionResponse> => fetchContent('privacy')
