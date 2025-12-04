import type { SectionResponse } from '@pzero/shared/pzero'
import { useEffect, useState } from 'react'

interface LegalDocumentRendererProps {
  title: string
  apiEndpoint: string
  loadingMessage?: string
  errorMessage?: string
}

export function LegalDocumentRenderer({
  title,
  apiEndpoint,
  loadingMessage = 'Loading document...',
  errorMessage = 'Failed to load document',
}: LegalDocumentRendererProps) {
  const [documentData, setDocumentData] = useState<SectionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocumentData()
  }, [apiEndpoint])

  const fetchDocumentData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(apiEndpoint)

      if (!response.ok) {
        throw new Error(`Failed to fetch ${title.toLowerCase()}`)
      }

      const data: SectionResponse = await response.json()
      setDocumentData(data)
    } catch (err) {
      console.error(`Error fetching ${title.toLowerCase()}:`, err)
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-base text-gray-600">{loadingMessage}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-white">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm font-medium"
            >
              ← Back
            </button>
          </div>

          {/* Error Content */}
          <div className="text-center p-8">
            <h1 className="text-2xl mb-4 text-red-600">Error</h1>
            <p className="text-base text-gray-600 mb-8">{error}</p>
            <button
              onClick={fetchDocumentData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-base font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Content */}
        <div>
          <h1 className="text-3xl mb-8 text-gray-800 font-bold">{title}</h1>

          {documentData?.sections.map((section, index) => (
            <div key={index} className="mb-8">
              <h2 className="text-xl mb-4 text-gray-700 font-semibold">{section.title}</h2>
              <div
                className="text-gray-600 leading-relaxed prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </div>
          ))}

          <div className="mt-12 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-base font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
