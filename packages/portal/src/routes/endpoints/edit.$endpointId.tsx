'use client'

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EndpointDrawer } from '@/routes/dashboard/proxy-targets-components/endpoint-drawer'
import { getProxyTarget, updateProxyTarget } from '@/services/proxy-targets.service'
import type { ProxyTarget } from '@/types/proxy-targets'

export const Route = createFileRoute('/endpoints/edit/$endpointId')({
  component: EditEndpointPage,
})

function EditEndpointPage() {
  const navigate = Route.useNavigate()
  const { endpointId } = Route.useParams()
  const [endpoint, setEndpoint] = useState<ProxyTarget | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEndpoint = async () => {
      try {
        const data = await getProxyTarget(endpointId)
        setEndpoint(data)
      } catch (error) {
        console.error('Failed to fetch endpoint:', error)
        toast.error('Failed to load endpoint')
        navigate({ to: '/dashboard/proxy-targets' })
      } finally {
        setLoading(false)
      }
    }

    fetchEndpoint()
  }, [endpointId, navigate])

  const handleUpdate = async (updatedEndpoint: ProxyTarget) => {
    try {
      await updateProxyTarget(endpointId, {
        name: updatedEndpoint.name,
        url: updatedEndpoint.url,
        port: updatedEndpoint.port,
      })
      navigate({ to: '/dashboard/proxy-targets' })
    } catch (error) {
      console.error('Failed to update endpoint:', error)
      toast.error('Failed to update endpoint')
      throw error
    }
  }

  const handleCancel = () => {
    navigate({ to: '/dashboard/proxy-targets' })
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
