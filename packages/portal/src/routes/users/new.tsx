'use client'

import { createFileRoute, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import { UserDrawer } from '@/features/users/components'
import { createUser } from '@/services/users.service'
import { AuthStore } from '@/stores/auth'
import type { User } from '@/types/users'

export const Route = createFileRoute('/users/new')({
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
  component: NewUserPage,
})

function NewUserPage() {
  const navigate = Route.useNavigate()

  const handleAdd = async (userData: Partial<User>) => {
    try {
      await createUser({
        name: userData.name!,
        email: userData.email!,
        phone: userData.phone || undefined,
        handle: userData.handle || undefined,
      })
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
