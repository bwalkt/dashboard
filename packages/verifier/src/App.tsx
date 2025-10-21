import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { AuthorizationPrompt } from './components/AuthorizationPrompt'
import type { AuthRequest } from './types/auth'

function App() {
  const [currentRequest, setCurrentRequest] = useState<AuthRequest | null>(null)

  useEffect(() => {
    // Listen for authorization requests from the backend
    const unlisten = listen<AuthRequest>('auth-request', event => {
      console.log('Received auth request:', event.payload)
      setCurrentRequest(event.payload)
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [])

  const handleAuthResponse = (approved: boolean) => {
    console.log(`Authorization ${approved ? 'approved' : 'denied'}`)
    setCurrentRequest(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthorizationPrompt request={currentRequest} onResponse={handleAuthResponse} />
    </div>
  )
}

export default App
