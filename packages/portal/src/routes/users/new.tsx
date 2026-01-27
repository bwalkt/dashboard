'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { UserDrawer } from '@/features/users/components'
import { AuthLoadingComponent, requireAuth } from '@/lib/auth-guard'
import { createUser } from '@/services/users.service'
import type { User } from '@/types/users'

export const Route = createFileRoute('/users/new')({
  component: NewUserPage,
  pendingComponent: AuthLoadingComponent,
  beforeLoad: requireAuth,
})

function NewUserPage() {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const handleAdd = async (userData: Partial<User>) => {
    try {
      await createUser({
        name: userData.name!,
        email: userData.email!,
        phone: userData.phone || undefined,
        handle: userData.handle || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      navigate({ to: '/users' })
    } catch (error) {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user')
    }
  }

  const handleCancel = () => {
    navigate({ to: '/users' })
  }

  return (
    <UserDrawer
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
