import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastUtils } from '@/lib/toast'
import { type CreateUserPayload, usersService } from '@/services/api/users'
import type { ColumnSchema } from './types'

export function useUsers() {
  return useQuery<ColumnSchema[]>({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers() as Promise<ColumnSchema[]>,
    placeholderData: keepPreviousData,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserPayload> }) => usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toastUtils.successTemp('User updated successfully')
    },
    onError: (error: Error) => {
      toastUtils.error('Failed to update user', { description: error.message })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toastUtils.successTemp('User deleted successfully')
    },
    onError: (error: Error) => {
      toastUtils.error('Failed to delete user', { description: error.message })
    },
  })
}
