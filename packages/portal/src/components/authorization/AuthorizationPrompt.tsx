import { invoke } from '@tauri-apps/api/core'
import { CheckCircle, Shield, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AuthRequest } from '@/types/auth'

interface AuthorizationPromptProps {
  request: AuthRequest | null
  onResponse: (approved: boolean) => void
}

export function AuthorizationPrompt({ request, onResponse }: AuthorizationPromptProps) {
  const [processing, setProcessing] = useState(false)

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <Shield className="w-16 h-16 mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">PZero Verifier</h1>
        <p className="text-muted-foreground">Waiting for authorization requests...</p>
      </div>
    )
  }

  const handleApprove = async () => {
    setProcessing(true)
    try {
      await invoke('handle_auth_response', {
        requestId: request.id,
        approved: true,
      })
      onResponse(true)
    } catch (error) {
      console.error('Failed to approve request:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDeny = async () => {
    setProcessing(true)
    try {
      await invoke('handle_auth_response', {
        requestId: request.id,
        approved: false,
      })
      onResponse(false)
    } catch (error) {
      console.error('Failed to deny request:', error)
    } finally {
      setProcessing(false)
    }
  }

  const formattedTime = new Date(request.timestamp * 1000).toLocaleTimeString()

  return (
    <div className="flex flex-col h-screen p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-xl font-bold">Authorization Required</h1>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Endpoint</label>
            <p className="text-lg font-mono break-all">{request.endpoint}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Method</label>
            <p className="text-lg font-semibold">{request.method}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Time</label>
            <p className="text-lg">{formattedTime}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="destructive" size="lg" onClick={handleDeny} disabled={processing} className="w-full">
          <XCircle className="mr-2 h-5 w-5" />
          Deny
        </Button>
        <Button variant="default" size="lg" onClick={handleApprove} disabled={processing} className="w-full">
          <CheckCircle className="mr-2 h-5 w-5" />
          Approve
        </Button>
      </div>
    </div>
  )
}
