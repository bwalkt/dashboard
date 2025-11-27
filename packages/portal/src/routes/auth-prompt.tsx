import { createFileRoute } from '@tanstack/react-router'
import { AuthorizationPrompt } from '@/components/authorization/AuthorizationPrompt'

export const Route = createFileRoute('/auth-prompt')({
  component: AuthPromptPage,
})

function AuthPromptPage() {
  return (
    <div className="min-h-screen bg-background">
      <AuthorizationPrompt />
    </div>
  )
}
