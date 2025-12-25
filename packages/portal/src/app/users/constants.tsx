'use client'

import type { DataTableFilterField } from '@/components/data-table/types'
import type { ColumnSchema, UserStatus, UserOnlineStatus } from './types'

const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BANNED', 'DELETED', 'PENDING', 'BLOCKED']
const ONLINE_STATUSES: UserOnlineStatus[] = ['ONLINE', 'OOO', 'AWAY', 'BUSY', 'INACTIVE']

export const filterFields = [
  {
    label: 'Status',
    value: 'status',
    type: 'checkbox',
    options: USER_STATUSES.map(status => ({ label: status, value: status })),
    defaultOpen: true,
  },
  {
    label: 'Online Status',
    value: 'online_status',
    type: 'checkbox',
    options: ONLINE_STATUSES.map(status => ({ label: status, value: status })),
  },
  {
    label: 'Email Verified',
    value: 'email_verified',
    type: 'checkbox',
    options: [
      { label: 'Verified', value: true },
      { label: 'Not Verified', value: false },
    ],
  },
  {
    label: 'Active',
    value: 'is_act',
    type: 'checkbox',
    options: [
      { label: 'Active', value: true },
      { label: 'Inactive', value: false },
    ],
  },
  {
    label: 'Name',
    value: 'name',
    type: 'input',
  },
  {
    label: 'Email',
    value: 'email',
    type: 'input',
  },
  {
    label: 'Handle',
    value: 'handle',
    type: 'input',
  },
] satisfies DataTableFilterField<ColumnSchema>[]
