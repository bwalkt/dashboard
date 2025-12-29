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
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
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
    accessorKey: 'is_act',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const isActive = row.original.is_act
      return (
        <Badge
          className={
            isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'
          }
          variant="outline"
        >
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      )
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
