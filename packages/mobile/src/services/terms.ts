import { api } from '@pzero/shared/api'

export interface TermsSection {
  title: string
  content: string
}

export interface TermsResponse {
  sections: TermsSection[]
}

// Fallback terms content
const fallbackTerms = `##User & Customer Responsibilities##
These clauses outline what the user of a service or system must do to maintain security. Key responsibilities often include protecting account information like logon IDs and passwords and refraining from unauthorized copying or distribution of confidential data. Acceptable use policies typically prohibit activities such as attempting to reverse-engineer software, harassing other users, degrading system performance, or accessing systems without authorization. Additionally, users may be required to employ reasonable security safeguards, follow industry-standard practices, and comply with applicable laws and regulations when using the services.

##Confidentiality & Data Protection##
Confidential information typically remains the property of the owner, and access is granted only as necessary to use the services. Data use and processing clauses often specify that personal data should only be processed as required for the services, not retained longer than necessary, and not used for third-party purposes. Service providers are typically responsible for maintaining security programs to protect the confidentiality and security of customer data, guard against threats, and prevent unauthorized access.

##Limitation of Liability & Warranties##
These clauses limit the legal and financial exposure of the service provider, recognizing that perfect security is not always achievable. Services may be provided "AS-IS" without warranties, and the service provider may disclaim support obligations and other liabilities. Liability is often capped at a specific amount, such as the total subscription fees paid over a defined period. Customers may also agree to assume the risk for damages or losses resulting from the service.

##Incident Reporting & Response##
These terms outline the procedures to follow in the event of a security breach. Customers may be required to immediately report unauthorized access or disclosure of confidential information to the service provider. Cooperation is often necessary, including designating contact persons to respond to security events and take recommended mitigation actions.`

export const fetchTermsAndConditions = async (): Promise<TermsResponse> => {
  try {
    console.log('Attempting to fetch terms from /terms endpoint...')
    const response = await api.get('/terms')
    console.log('Terms API response:', response)

    // Parse the response content into structured sections
    const content = response

    // If response is already structured with sections, return it
    if (content && content.sections && Array.isArray(content.sections)) {
      return content
    }

    // If response is a string, parse it into JSON sections
    if (typeof content === 'string') {
      return parseTermsContent(content)
    }

    // If response is an object, try to structure it
    if (typeof content === 'object' && content !== null) {
      // If it's an array, treat each item as a section
      if (Array.isArray(content)) {
        const sections = content.map((item, index) => ({
          title: item.title || `Section ${index + 1}`,
          content: item.content || JSON.stringify(item, null, 2),
        }))
        return { sections }
      }

      // If it's a single object, create one section
      return {
        sections: [
          {
            title: 'Terms and Conditions',
            content: JSON.stringify(content, null, 2),
          },
        ],
      }
    }

    // Fallback to default content
    console.log('Using fallback terms content')
    return parseTermsContent(fallbackTerms)
  } catch (error) {
    console.error('Failed to fetch terms from API:', error)

    // In development, throw the error instead of using fallback
    if (__DEV__) {
      throw new Error(`Terms API endpoint not available: ${error}`)
    }

    console.log('Using fallback terms content due to API error')
    return parseTermsContent(fallbackTerms)
  }
}

const parseTermsContent = (content: string): TermsResponse => {
  const sections: TermsSection[] = []
  const sectionHeaders = content.match(/##([^#]+)##/g) || []

  if (sectionHeaders.length === 0) {
    return {
      sections: [
        {
          title: 'Terms and Conditions',
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
