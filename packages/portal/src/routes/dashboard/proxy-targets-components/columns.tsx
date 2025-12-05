'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ProxyTarget } from '@/types/proxy-targets'

interface ColumnsProps {
  onEdit: (target: ProxyTarget) => void
  onDelete: (target: ProxyTarget) => void
}

export const createColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<ProxyTarget>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => {
      const id = row.getValue('id') as string
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs max-w-[200px] truncate">{id}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(id)
              toast.success('ID copied to clipboard')
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('name')}</div>
    },
  },
  {
    accessorKey: 'url',
    header: ({ column }) => <DataTableColumnHeader column={column} title="URL" />,
    cell: ({ row }) => {
      const url = row.getValue('url') as string
      return <div className="max-w-[200px] truncate font-mono text-sm">{url}</div>
    },
  },
  {
    accessorKey: 'port',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Port" />,
    cell: ({ row }) => {
      const port = row.getValue('port') as number
      return <div className="font-mono">{port}</div>
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string
      return <div className="text-sm text-muted-foreground">{format(new Date(date), 'MMM dd, yyyy HH:mm')}</div>
    },
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated At" />,
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as string
      return <div className="text-sm text-muted-foreground">{format(new Date(date), 'MMM dd, yyyy HH:mm')}</div>
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const target = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">Open menu</span>
              <span className="text-lg">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(target)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(target)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
  },
]
