'use client'

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EndpointDrawer } from '@/routes/dashboard/endpoint-components/endpoint-drawer'
import { getEndpoint, updateEndpoint } from '@/services/endpoints.service'
import type { Endpoint } from '@/types/endpoints'

export const Route = createFileRoute('/endpoints/edit/$endpointId')({
  component: EditEndpointPage,
})

function EditEndpointPage() {
  const navigate = Route.useNavigate()
  const { endpointId } = Route.useParams()
  const [endpoint, setEndpoint] = useState<Endpoint | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEndpoint = async () => {
      try {
        const data = await getEndpoint(endpointId)
        setEndpoint(data)
      } catch (error) {
        console.error('Failed to fetch endpoint:', error)
        toast.error('Failed to load endpoint')
        navigate({ to: '/endpoints' })
      } finally {
        setLoading(false)
      }
    }

    fetchEndpoint()
  }, [endpointId, navigate])

  const handleUpdate = async (updatedEndpoint: Endpoint) => {
    try {
      await updateEndpoint(endpointId, {
        name: updatedEndpoint.name,
        url: updatedEndpoint.url,
        port: updatedEndpoint.port || undefined,
      })
      navigate({ to: '/endpoints' })
    } catch (error) {
      console.error('Failed to update endpoint:', error)
      toast.error('Failed to update endpoint')
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: '/endpoints' })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!endpoint) {
    return <div>Endpoint not found</div>
  }

  return (
    <EndpointDrawer
      endpoint={endpoint}
      onUpdate={handleUpdate}
      open={true}
      onOpenChange={open => {
        if (!open) {
          handleCancel()
        }
      }}
    />
  )
}
