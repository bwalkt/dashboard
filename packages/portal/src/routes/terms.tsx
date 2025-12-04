import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentRenderer } from '@/components/LegalDocumentRenderer'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalDocumentRenderer
      title="Terms of Service"
      apiEndpoint="/api/terms"
      loadingMessage="Loading terms of service..."
      errorMessage="Failed to load terms of service"
    />
  )
}
