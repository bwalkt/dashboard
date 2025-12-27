'use client'

import { createFileRoute, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import { EndpointDrawer } from '@/routes/dashboard/proxy-targets-components/endpoint-drawer'
import { createProxyTarget } from '@/services/proxy-targets.service'
import type { ProxyTarget } from '@/types/proxy-targets'

export const Route = createFileRoute('/endpoints/new')({
  component: NewEndpointPage,
})

function NewEndpointPage() {
  const navigate = Route.useNavigate()

  const handleAdd = async (endpointData: Partial<ProxyTarget>) => {
    try {
      await createProxyTarget({
        name: endpointData.name!,
        url: endpointData.url!,
        port: endpointData.port || undefined,
      })
      navigate({ to: '/dashboard/proxy-targets' })
    } catch (error) {
      console.error('Failed to create endpoint:', error)
      toast.error('Failed to create endpoint')
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: '/dashboard/proxy-targets' })
  }

  return (
    <EndpointDrawer
      onAdd={handleAdd}
      open={true}
      onOpenChange={open => {
        if (!open) {
          handleCancel()
        }
      }}
    />
  )
}
