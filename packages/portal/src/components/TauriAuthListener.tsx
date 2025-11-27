import { useNavigate } from '@tanstack/react-router'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import type { AuthRequest } from '@/types/auth'

export function TauriAuthListener() {
  const navigate = useNavigate()

  useEffect(() => {
    // Only set up listener if we're in Tauri environment
    if (!window.__TAURI_INTERNALS__) {
      return
    }

    // Listen for authorization requests from the backend
    const unlisten = listen<AuthRequest>('auth-request', event => {
      if (import.meta.env.DEV) {
        console.log('Received auth request:', event.payload)
      }
      // Navigate to auth-prompt route with the request data
      navigate({
        to: '/auth-prompt',
        search: {
          request: event.payload,
        },
      })
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [navigate])

  return null
}
