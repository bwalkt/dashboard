import { toast } from 'sonner'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useTauriAuth } from '@/hooks/use-tauri-auth'

export default function GithubSignInButton() {
  const { signInWithGitHub: webSignIn, signInWithGitHubLoading } = useAuth()
  const { signInWithGitHub: tauriSignIn, isLoading: tauriLoading } = useTauriAuth()

  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__

  const loading = isTauri ? tauriLoading : signInWithGitHubLoading

  const handleGitHubSignIn = async () => {
    try {
      console.log('[GithubSignIn] Starting GitHub authentication...', { isTauri })

      if (isTauri) {
        const result = await tauriSignIn()
        console.log('[GithubSignIn] Tauri sign-in result:', result)
        // Check if tauriSignIn returns an error object
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          toast.error('Failed to sign in with GitHub: ' + result.error.message)
        } else {
          toast.success('Opening GitHub authentication...')
        }
      } else {
        const { error } = await webSignIn()
        console.log('[GithubSignIn] Web sign-in result:', { error })
        if (error) {
          toast.error('Failed to sign in with GitHub: ' + error.message)
        } else {
          toast.success('Redirecting to GitHub...')
        }
      }
    } catch (error) {
      console.error('[GithubSignIn] GitHub sign-in error:', error)
      toast.error('Failed to sign in with GitHub: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <Button className="w-full" variant="outline" type="button" onClick={handleGitHubSignIn} disabled={loading}>
      <Icons.github className="mr-2 h-4 w-4" />
      {loading ? 'Signing in...' : 'Continue with Github'}
    </Button>
  )
}
