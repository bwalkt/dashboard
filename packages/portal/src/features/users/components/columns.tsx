'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
  createActionsColumn,
  createBooleanColumn,
  createDateColumn,
  createHandleColumn,
  createNameColumn,
  createStatusColumn,
} from '@/components/data-table/common-columns'
import type { User } from '@/types/users'

interface ColumnsProps {
  onDelete: (user: User) => void
  onSuspend?: (user: User) => void
  onActivate?: (user: User) => void
}

export const createColumns = ({ onDelete, onSuspend, onActivate }: ColumnsProps): ColumnDef<User>[] => [
  // User column with avatar and email
  createNameColumn<User>({
    accessorKey: 'name',
    showAvatar: true,
    avatarField: 'avatar',
    subTextAccessor: user => user.email,
  }),

  // Handle column
  createHandleColumn<User>(),

  // Status column (based on is_act field)
  {
    ...createStatusColumn<User>({
      accessorKey: 'is_act',
    }),
    cell: ({ row }) => {
      const user = row.original
      const status = user.is_act ? 'ACTIVE' : 'INACTIVE'
      return createStatusColumn<User>().cell?.({
        row: { ...row, getValue: () => status, original: user },
      } as any)
    },
  },

  // Online status column
  createStatusColumn<User>({
    accessorKey: 'online_status',
  }),

  // Last seen date
  createDateColumn<User>({
    accessorKey: 'last_seen',
    title: 'Last Seen',
  }),

  // Email verified boolean
  createBooleanColumn<User>('email_verified', 'Verified'),

  // Created at date
  createDateColumn<User>({
    accessorKey: 'c_at',
    title: 'Created At',
  }),

  // Active boolean
  createBooleanColumn<User>('is_act', 'Active'),

  // Actions column
  createActionsColumn<User>({
    editRoute: '/users/edit/$userId',
    routeParam: 'userId',
    onDelete,
    onCopyId: true,
    additionalActions:
      onSuspend || onActivate
        ? [
            ...(onSuspend
              ? [
                  {
                    label: 'Suspend',
                    onClick: onSuspend,
                    className: 'text-warning',
                  },
                ]
              : []),
            ...(onActivate
              ? [
                  {
                    label: 'Activate',
                    onClick: onActivate,
                    className: 'text-success',
                  },
                ]
              : []),
          ]
        : undefined,
  }),
]
