'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CrudShell } from '@/components/crud-shell'
import { AlertModal } from '@/components/modal/alert-modal'
import { Button } from '@/components/ui/button'
import { deleteEndpoint, getEndpoints } from '@/services/endpoints.service'
import type { Endpoint } from '@/types/endpoints'
import { createColumns } from './columns'

const AddEndpointButton = () => (
  <Button asChild>
    <Link to="/endpoints/new">
      <PlusIcon className="mr-2 h-4 w-4" />
      Add Endpoint
    </Link>
  </Button>
)

export function EndpointsPage() {
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<Endpoint | null>(null)

  // Fetch endpoints
  const {
    data: endpoints = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ['endpoints'],
    queryFn: getEndpoints,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      setIsDeleteDialogOpen(false)
      setSelectedTarget(null)
      toast.success('Endpoint deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete endpoint')
    },
  })

  const handleDelete = async () => {
    if (!selectedTarget) return
    await deleteMutation.mutateAsync(selectedTarget.id)
  }

  const openDeleteDialog = (target: Endpoint) => {
    setSelectedTarget(target)
    setIsDeleteDialogOpen(true)
  }

  const closeDialogs = () => {
    setIsDeleteDialogOpen(false)
    setSelectedTarget(null)
  }

  const allColumns = createColumns({
    onDelete: openDeleteDialog,
  })

  // Filter out ID column to hide it from the table
  const columns = allColumns.filter(column => column.id !== 'id')

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['endpoints'] })
  }

  return (
    <>
      <CrudShell
        title="Endpoints"
        description="List of all configured endpoints"
        columns={columns}
        data={endpoints}
        addButton={<AddEndpointButton />}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
      />

      {/* Delete Confirmation Dialog */}
      <AlertModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDialogs}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
