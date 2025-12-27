export interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  phone?: string | null
  phone_verified: boolean
  handle?: string
  org_id?: string | null
  is_del: boolean
  c_at: string // created_at from backend
  u_at?: string // updated_at from backend
  // Frontend-specific fields (can be added later if needed)
  role?: 'ADMIN' | 'USER' | 'VIEWER' | 'MANAGER'
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  avatar?: string | null
  department?: string | null
  title?: string | null
}

export interface CreateUserRequest {
  name: string
  email: string
  phone?: string
  role?: 'ADMIN' | 'USER' | 'VIEWER' | 'MANAGER'
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  department?: string
  title?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  phone?: string
  role?: 'ADMIN' | 'USER' | 'VIEWER' | 'MANAGER'
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  department?: string
  title?: string
}

export interface UsersResponse {
  success: boolean
  users: User[]
}

export interface UserResponse {
  success: boolean
  user: User
}

export interface UsersListResponse {
  users: User[]
  total: number
  page: number
  limit: number
}
