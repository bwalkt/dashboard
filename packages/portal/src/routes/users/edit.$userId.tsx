'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserDrawer } from '@/features/users/components'
import { getUser, updateUser } from '@/services/users.service'
import { AuthStore } from '@/stores/auth'
import type { User } from '@/types/users'

export const Route = createFileRoute('/users/edit/$userId')({
  beforeLoad: async ({ location }) => {
    // Wait for auth check if loading
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    while (AuthStore.loading && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // Check if user is authenticated
    if (!AuthStore.user) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: EditUserPage,
})

function EditUserPage() {
  const navigate = Route.useNavigate()
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
    retry: false,
  })

  useEffect(() => {
    if (error) {
      console.error('Failed to fetch user:', error)
      toast.error('Failed to load user')
      navigate({ to: '/users' })
    }
  }, [error])

  const updateMutation = useMutation({
    mutationFn: (updatedUser: User) =>
      updateUser(userId, {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || undefined,
        handle: updatedUser.handle || undefined,
        is_act: updatedUser.is_act,
        is_del: updatedUser.is_del,
        role: updatedUser.role,
        status: updatedUser.status,
        department: updatedUser.department || undefined,
        title: updatedUser.title || undefined,
      }),
    onSuccess: () => {
      // Invalidate both the individual user and the list
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
      navigate({ to: '/users' })
    },
    onError: (error: Error) => {
      console.error('Failed to update user:', error)
      toast.error(error?.message || 'Failed to update user')
    },
  })

  const handleUpdate = (updatedUser: User) => {
    updateMutation.mutate(updatedUser)
  }

  const handleCancel = () => {
    navigate({ to: '/users' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/users' })}>
          Back to Users
        </Button>
      </div>
    )
  }

  return (
    <UserDrawer
      user={user}
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
