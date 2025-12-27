'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CrudShell } from '@/components/crud-shell'
import { AlertModal } from '@/components/modal/alert-modal'
import { Button } from '@/components/ui/button'
import { deleteProxyTarget, getProxyTargets, refreshCache } from '@/services/proxy-targets.service'
import type { ProxyTarget } from '@/types/proxy-targets'
import { createColumns } from './columns'

const AddEndpointButton = () => (
  <Button asChild>
    <Link to="/endpoints/new">
      <PlusIcon className="mr-2 h-4 w-4" />
      Add Endpoint
    </Link>
  </Button>
)

export function ProxyTargetsPage() {
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<ProxyTarget | null>(null)

  // Fetch endpoints
  const { data: proxyTargets = [], error } = useQuery({
    queryKey: ['proxy-targets'],
    queryFn: getProxyTargets,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProxyTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      setIsDeleteDialogOpen(false)
      setSelectedTarget(null)
      toast.success('Endpoint deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete endpoint')
    },
  })

  // Refresh cache mutation
  const refreshCacheMutation = useMutation({
    mutationFn: refreshCache,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      toast.success(`Cache refreshed successfully. ${data.count} endpoint(s) cached.`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to refresh cache')
    },
  })

  const handleDelete = async () => {
    if (!selectedTarget) return
    await deleteMutation.mutateAsync(selectedTarget.id)
  }

  const handleRefreshCache = () => {
    refreshCacheMutation.mutate()
  }

  const openDeleteDialog = (target: ProxyTarget) => {
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
    queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
  }

  return (
    <>
      <CrudShell
        title="Endpoints"
        description="List of all configured endpoints"
        columns={columns}
        data={proxyTargets}
        addButton={<AddEndpointButton />}
        isLoading={false}
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
