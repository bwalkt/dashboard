import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthorizationPrompt } from '@/components/authorization/AuthorizationPrompt'
import type { AuthRequest } from '@/types/auth'

export const Route = createFileRoute('/auth-prompt')({
  component: AuthPromptPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      request: search.request as AuthRequest | undefined,
    }
  },
})

function AuthPromptPage() {
  const navigate = useNavigate()
  const { request } = useSearch({ from: '/auth-prompt' })

  const handleResponse = (approved: boolean) => {
    console.log('Auth response:', approved)
    // Navigate back to the main app or a success page
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthorizationPrompt request={request || null} onResponse={handleResponse} />
    </div>
  )
}
