'use client'

import { createFileRoute, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import { EndpointDrawer } from '@/features/endpoints/components/endpoint-drawer'
import { createEndpoint } from '@/services/endpoints.service'
import type { Endpoint } from '@/types/endpoints'

export const Route = createFileRoute('/endpoints/new')({
  component: NewEndpointPage,
})

function NewEndpointPage() {
  const navigate = Route.useNavigate()

  const handleAdd = async (endpointData: Partial<Endpoint>) => {
    try {
      await createEndpoint({
        name: endpointData.name!,
        url: endpointData.url!,
        port: endpointData.port || undefined,
      })
      toast.success('Endpoint created successfully')
      navigate({ to: '/endpoints' })
    } catch (error) {
      console.error('Failed to create endpoint:', error)
      toast.error('Failed to create endpoint')
    }
  }

  const handleCancel = () => {
    navigate({ to: '/endpoints' })
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
