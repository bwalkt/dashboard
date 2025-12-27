'use client'

import type { DataTableFilterField } from '@/components/data-table/types'
import type { User } from '@/types/users'

export const filterFields = [
  {
    label: 'Name',
    value: 'name',
    type: 'input',
    placeholder: 'Filter users...',
  },
  {
    label: 'Email',
    value: 'email',
    type: 'input',
    placeholder: 'Filter by email...',
  },
  {
    label: 'Handle',
    value: 'handle',
    type: 'input',
    placeholder: 'Filter by handle...',
  },
  {
    label: 'Email Verified',
    value: 'email_verified',
    type: 'checkbox',
    options: [
      { label: 'Verified', value: 'true' },
      { label: 'Unverified', value: 'false' },
    ],
  },
  {
    label: 'Phone Verified',
    value: 'phone_verified',
    type: 'checkbox',
    options: [
      { label: 'Verified', value: 'true' },
      { label: 'Unverified', value: 'false' },
    ],
  },
] satisfies DataTableFilterField<User>[]
