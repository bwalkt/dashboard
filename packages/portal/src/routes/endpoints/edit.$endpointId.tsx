'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { EndpointDrawer } from '@/features/endpoints/components/endpoint-drawer'
import { getEndpoint, updateEndpoint } from '@/services/endpoints.service'
import type { Endpoint } from '@/types/endpoints'

export const Route = createFileRoute('/endpoints/edit/$endpointId')({
  component: EditEndpointPage,
})

function EditEndpointPage() {
  const navigate = Route.useNavigate()
  const { endpointId } = Route.useParams()
  const queryClient = useQueryClient()

  const {
    data: endpoint,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['endpoint', endpointId],
    queryFn: () => getEndpoint(endpointId),
    retry: false,
  })

  useEffect(() => {
    if (error) {
      console.error('Failed to fetch endpoint:', error)
      toast.error('Failed to load endpoint')
      navigate({ to: '/endpoints' })
    }
  }, [error])

  const updateMutation = useMutation({
    mutationFn: (updatedEndpoint: Endpoint) =>
      updateEndpoint(endpointId, {
        name: updatedEndpoint.name,
        url: updatedEndpoint.url,
        port: updatedEndpoint.port || undefined,
      }),
    onSuccess: () => {
      // Invalidate both the individual endpoint and the list
      queryClient.invalidateQueries({ queryKey: ['endpoint', endpointId] })
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      toast.success('Endpoint updated successfully')
      navigate({ to: '/endpoints' })
    },
    onError: (error: any) => {
      console.error('Failed to update endpoint:', error)
      toast.error(error?.message || 'Failed to update endpoint')
    },
  })

  const handleUpdate = async (updatedEndpoint: Endpoint) => {
    updateMutation.mutate(updatedEndpoint)
  }

  const handleCancel = () => {
    navigate({ to: '/endpoints' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
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
