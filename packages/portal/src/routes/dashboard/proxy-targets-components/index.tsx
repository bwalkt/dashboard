'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/app/data-table'
import { AlertModal } from '@/components/modal/alert-modal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  createProxyTarget,
  deleteProxyTarget,
  getProxyTargets,
  refreshCache,
  updateProxyTarget,
} from '@/services/proxy-targets.service'
import type { CreateProxyTargetRequest, ProxyTarget, UpdateProxyTargetRequest } from '@/types/proxy-targets'
import { createColumns } from './columns'
import { ProxyTargetForm } from './proxy-target-form'

export function ProxyTargetsPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<ProxyTarget | null>(null)

  // Fetch proxy targets
  const { data: proxyTargets = [], error } = useQuery({
    queryKey: ['proxy-targets'],
    queryFn: getProxyTargets,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProxyTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      setIsCreateDialogOpen(false)
      toast.success('Proxy target created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create proxy target')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProxyTargetRequest }) => updateProxyTarget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      setIsEditDialogOpen(false)
      setSelectedTarget(null)
      toast.success('Proxy target updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update proxy target')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProxyTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      setIsDeleteDialogOpen(false)
      setSelectedTarget(null)
      toast.success('Proxy target deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete proxy target')
    },
  })

  // Refresh cache mutation
  const refreshCacheMutation = useMutation({
    mutationFn: refreshCache,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })
      toast.success(`Cache refreshed successfully. ${data.count} proxy target(s) cached.`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to refresh cache')
    },
  })

  const handleCreate = async (data: CreateProxyTargetRequest) => {
    await createMutation.mutateAsync(data)
  }

  const handleEdit = async (data: UpdateProxyTargetRequest) => {
    if (!selectedTarget) return
    await updateMutation.mutateAsync({ id: selectedTarget.id, data })
  }

  const handleDelete = async () => {
    if (!selectedTarget) return
    await deleteMutation.mutateAsync(selectedTarget.id)
  }

  const handleRefreshCache = () => {
    refreshCacheMutation.mutate()
  }

  const openEditDialog = (target: ProxyTarget) => {
    setSelectedTarget(target)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (target: ProxyTarget) => {
    setSelectedTarget(target)
    setIsDeleteDialogOpen(true)
  }

  const closeDialogs = () => {
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setIsDeleteDialogOpen(false)
    setSelectedTarget(null)
  }

  const allColumns = createColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
  })

  // Filter out ID column to hide it from the table
  const columns = allColumns.filter(column => column.id !== 'id')

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load proxy targets</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['proxy-targets'] })}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-6 mx-auto">
      <div className="flex items-center justify-between px-6">
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => setIsCreateDialogOpen(true)}>Create Proxy Target</Button>
        </div>
      </div>
      <div className="pl-0 w-full">
        <DataTable
          cellPadding="sm"
          columns={columns}
          data={proxyTargets}
          title="Proxy Targets"
          description="List of all configured proxy targets"
        />
      </div>
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Proxy Target</DialogTitle>
          </DialogHeader>
          <ProxyTargetForm
            onSubmit={handleCreate as (data: CreateProxyTargetRequest) => Promise<void>}
            onCancel={closeDialogs}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Proxy Target</DialogTitle>
          </DialogHeader>
          {selectedTarget && (
            <ProxyTargetForm
              target={selectedTarget}
              onSubmit={handleEdit}
              onCancel={closeDialogs}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDialogs}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
