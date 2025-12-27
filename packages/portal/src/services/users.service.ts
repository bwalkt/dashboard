import { api } from '@/lib/api'
import type { CreateUserRequest, UpdateUserRequest, User, UserResponse, UsersResponse } from '@/types/users'

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/api/users')
  return response
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User> {
  const response = await api.get<User>(`/api/users/${id}`)
  return response
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await api.post<User>('/api/users', data)
  return response
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const response = await api.put<User>(`/api/users/${id}`, data)
  return response
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`)
}

/**
 * Suspend a user
 */
export async function suspendUser(id: string): Promise<User> {
  const response = await api.post<User>(`/api/users/${id}/suspend`)
  return response
}

/**
 * Activate a user
 */
export async function activateUser(id: string): Promise<User> {
  const response = await api.post<User>(`/api/users/${id}/activate`)
  return response
}
