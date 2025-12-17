'use client'

import type { Org } from '@pzero/shared/pzero'
import type { DataTableFilterField } from '@/components/data-table/types'

export const filterFields = [
  {
    label: 'Name',
    value: 'name',
    type: 'input',
    placeholder: 'Filter organizations...',
  },
  {
    label: 'Status',
    value: 'status',
    type: 'checkbox',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Suspended', value: 'suspended' },
    ],
  },
  {
    label: 'Plan',
    value: 'plan',
    type: 'checkbox',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Starter', value: 'starter' },
      { label: 'Pro', value: 'pro' },
      { label: 'Enterprise', value: 'enterprise' },
    ],
  },
  {
    label: 'Email',
    value: 'email',
    type: 'input',
    placeholder: 'Filter by email...',
  },
] satisfies DataTableFilterField<Org>[]
