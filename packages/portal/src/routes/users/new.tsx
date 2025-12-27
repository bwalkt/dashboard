'use client'

import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { UserDrawer } from '@/routes/dashboard/user-components'
import { createUser } from '@/services/users.service'
import type { User } from '@/types/users'

export const Route = createFileRoute('/users/new')({
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
        role: userData.role || 'USER',
        status: userData.status || 'ACTIVE',
        department: userData.department || undefined,
        title: userData.title || undefined,
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
