'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
  createActionsColumn,
  createDateColumn,
  createIdColumn,
  createNameColumn,
} from '@/components/data-table/common-columns'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import type { Endpoint } from '@/types/endpoints'

interface ColumnsProps {
  onDelete: (target: Endpoint) => void
}

export const createColumns = ({ onDelete }: ColumnsProps): ColumnDef<Endpoint>[] => [
  // ID column with copy functionality
  createIdColumn<Endpoint>({
    showCopyButton: true,
  }),

  // Name column
  createNameColumn<Endpoint>({
    showAvatar: false,
  }),

  // URL column (custom implementation)
  {
    accessorKey: 'url',
    header: ({ column }) => <DataTableColumnHeader column={column} title="URL" />,
    cell: ({ row }) => {
      const url = row.getValue('url') as string
      return <div className="max-w-[200px] truncate font-mono text-sm">{url}</div>
    },
  },

  // Port column (custom implementation)
  {
    accessorKey: 'port',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Port" />,
    cell: ({ row }) => {
      const port = row.getValue('port') as number
      return <div className="font-mono">{port}</div>
    },
  },

  // Created date column
  createDateColumn<Endpoint>({
    accessorKey: 'createdAt',
    title: 'Created At',
  }),

  // Updated date column
  createDateColumn<Endpoint>({
    accessorKey: 'updatedAt',
    title: 'Updated At',
  }),

  // Actions column
  createActionsColumn<Endpoint>({
    editRoute: '/endpoints/edit/$endpointId',
    routeParam: 'endpointId',
    onDelete,
    onCopyId: false, // Already have ID column with copy
  }),
]
