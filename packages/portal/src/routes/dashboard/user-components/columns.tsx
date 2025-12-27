'use client'

import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Copy, MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/types/users'

interface ColumnsProps {
  onDelete: (user: User) => void
  onSuspend?: (user: User) => void
  onActivate?: (user: User) => void
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'destructive'
    case 'MANAGER':
      return 'default'
    case 'USER':
      return 'secondary'
    case 'VIEWER':
      return 'outline'
    default:
      return 'secondary'
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'INACTIVE':
      return 'secondary'
    case 'PENDING':
      return 'warning'
    case 'SUSPENDED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export const createColumns = ({ onDelete, onSuspend, onActivate }: ColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'handle',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Handle" />,
    cell: ({ row }) => {
      const handle = row.getValue('handle') as string | undefined
      return handle ? (
        <span className="font-mono text-sm">@{handle}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
  },
  {
    accessorKey: 'email_verified',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Verified" />,
    cell: ({ row }) => {
      const user = row.original
      const emailVerified = user.email_verified
      const phoneVerified = user.phone_verified

      return (
        <div className="flex gap-2">
          {emailVerified && (
            <Badge variant="outline" className="text-xs">
              Email
            </Badge>
          )}
          {phoneVerified && (
            <Badge variant="outline" className="text-xs">
              Phone
            </Badge>
          )}
          {!emailVerified && !phoneVerified && <span className="text-muted-foreground text-xs">Unverified</span>}
        </div>
      )
    },
  },
  {
    accessorKey: 'c_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = row.getValue('c_at') as string
      return <div className="text-sm text-muted-foreground">{format(new Date(date), 'MMM dd, yyyy')}</div>
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/users/edit/$userId" params={{ userId: user.id }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(user.id)
                toast.success('User ID copied')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
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
