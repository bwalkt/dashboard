import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentRenderer } from '@/components/LegalDocumentRenderer'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalDocumentRenderer
      title="Privacy Policy"
      apiEndpoint="/api/privacy"
      loadingMessage="Loading privacy policy..."
      errorMessage="Failed to load privacy policy"
    />
  )
}
