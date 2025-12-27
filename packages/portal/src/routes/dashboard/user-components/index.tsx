'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CrudShell } from '@/components/crud-shell'
import { AlertModal } from '@/components/modal/alert-modal'
import { Button } from '@/components/ui/button'
import { activateUser, deleteUser, getUsers, suspendUser } from '@/services/users.service'
import type { User } from '@/types/users'
import { createColumns } from './columns'
import { filterFields } from './constants'

const AddUserButton = () => (
  <Button asChild>
    <Link to="/users/new">
      <PlusIcon className="mr-2 h-4 w-4" />
      Add User
    </Link>
  </Button>
)

export function UsersPage() {
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Fetch users
  const {
    data: users = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
      toast.success('User deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete user')
    },
  })

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User suspended successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to suspend user')
    },
  })

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User activated successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to activate user')
    },
  })

  const handleDelete = async () => {
    if (!selectedUser) return
    await deleteMutation.mutateAsync(selectedUser.id)
  }

  const handleSuspend = (user: User) => {
    suspendMutation.mutate(user.id)
  }

  const handleActivate = (user: User) => {
    activateMutation.mutate(user.id)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const closeDialogs = () => {
    setIsDeleteDialogOpen(false)
    setSelectedUser(null)
  }

  const columns = createColumns({
    onDelete: openDeleteDialog,
    onSuspend: handleSuspend,
    onActivate: handleActivate,
  })

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  return (
    <>
      <CrudShell
        title="Users"
        description="Manage user accounts and permissions"
        columns={columns}
        data={users}
        filterFields={filterFields}
        addButton={<AddUserButton />}
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
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.name}? This will soft delete the user and they can be restored later if needed.`}
      />
    </>
  )
}

export { UserDrawer } from './user-drawer'
