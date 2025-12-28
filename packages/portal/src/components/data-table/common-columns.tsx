'use client'

import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Common column creators for reuse across different tables
 */

// Types for common column options
interface BaseEntity {
  id: string
  [key: string]: any
}

interface NameColumnOptions<T extends BaseEntity> {
  accessorKey?: string
  showAvatar?: boolean
  avatarField?: string
  subTextField?: string
  subTextAccessor?: (row: T) => string
}

interface StatusColumnOptions {
  accessorKey?: string
  variants?: Record<string, string>
  colors?: Record<string, string>
}

interface DateColumnOptions {
  accessorKey: string
  title: string
  dateFormat?: string
}

interface ActionsColumnOptions<T extends BaseEntity> {
  editRoute?: string
  routeParam?: string
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onCopyId?: boolean
  additionalActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (item: T) => void
    className?: string
  }>
}

/**
 * Creates a checkbox selection column
 */
export const createSelectColumn = <T extends BaseEntity>(): ColumnDef<T> => ({
  id: 'select',
  header: ({ table }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    </div>
  ),
  cell: ({ row }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
  size: 40,
})

/**
 * Creates an ID column with copy functionality
 */
export const createIdColumn = <T extends BaseEntity>(
  options: { title?: string; showCopyButton?: boolean } = {},
): ColumnDef<T> => ({
  accessorKey: 'id',
  header: ({ column }) => <DataTableColumnHeader column={column} title={options.title || 'ID'} />,
  cell: ({ row }) => {
    const id = row.getValue('id') as string
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs max-w-[200px] truncate">{id}</span>
        {options.showCopyButton !== false && (
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
        )}
      </div>
    )
  },
  enableHiding: true,
})

/**
 * Creates a name column with optional avatar and subtext
 */
export const createNameColumn = <T extends BaseEntity>(options: NameColumnOptions<T> = {}): ColumnDef<T> => ({
  accessorKey: options.accessorKey || 'name',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  cell: ({ row }) => {
    const item = row.original
    const name = row.getValue(options.accessorKey || 'name') as string
    const avatar = options.avatarField ? item[options.avatarField] : null
    const subText = options.subTextAccessor
      ? options.subTextAccessor(item)
      : options.subTextField
        ? item[options.subTextField]
        : null

    if (options.showAvatar) {
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatar || undefined} alt={name} />
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            {subText && <span className="text-xs text-muted-foreground">{subText}</span>}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col">
        <span className="font-medium">{name}</span>
        {subText && <span className="text-xs text-muted-foreground">{subText}</span>}
      </div>
    )
  },
  enableSorting: true,
  enableHiding: false,
})

/**
 * Creates a status column with colored badges
 */
export const createStatusColumn = <T extends BaseEntity>(options: StatusColumnOptions = {}): ColumnDef<T> => ({
  accessorKey: options.accessorKey || 'status',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
  cell: ({ row }) => {
    const status = row.getValue(options.accessorKey || 'status') as string
    const upperStatus = status?.toUpperCase()

    // Default color mapping
    const defaultColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-800 border-gray-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
      BLOCKED: 'bg-red-100 text-red-800 border-red-200',
      ONLINE: 'bg-green-100 text-green-800 border-green-200',
      OFFLINE: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    const colors = { ...defaultColors, ...options.colors }
    const colorClass = colors[upperStatus] || 'bg-gray-100 text-gray-800 border-gray-200'

    // Badge variants mapping
    const defaultVariants: Record<string, any> = {
      ACTIVE: 'default',
      INACTIVE: 'secondary',
      SUSPENDED: 'destructive',
      BLOCKED: 'destructive',
      PENDING: 'outline',
    }

    const variants = { ...defaultVariants, ...options.variants }
    const variant = variants[upperStatus]

    if (variant) {
      return <Badge variant={variant as any}>{upperStatus}</Badge>
    }

    return (
      <Badge className={colorClass} variant="outline">
        {upperStatus}
      </Badge>
    )
  },
  filterFn: (row, id, value) => {
    return value.includes(row.getValue(id))
  },
})

/**
 * Creates a date column with formatting
 */
export const createDateColumn = <T extends BaseEntity>(options: DateColumnOptions): ColumnDef<T> => ({
  accessorKey: options.accessorKey,
  header: ({ column }) => <DataTableColumnHeader column={column} title={options.title} />,
  cell: ({ row }) => {
    const date = row.getValue(options.accessorKey) as string | null
    if (!date) return <span className="text-muted-foreground">-</span>
    return (
      <div className="text-sm text-muted-foreground">
        {format(new Date(date), options.dateFormat || 'MMM dd, yyyy HH:mm')}
      </div>
    )
  },
})

/**
 * Creates a boolean column with checkmark display
 */
export const createBooleanColumn = <T extends BaseEntity>(accessorKey: string, title: string): ColumnDef<T> => ({
  accessorKey,
  header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
  cell: ({ row }) => {
    const value = row.getValue(accessorKey) as boolean
    return value ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">-</span>
  },
})

/**
 * Creates an email column
 */
export const createEmailColumn = <T extends BaseEntity>(accessorKey: string = 'email'): ColumnDef<T> => ({
  accessorKey,
  header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  cell: ({ row }) => {
    const email = row.getValue(accessorKey) as string
    return <span className="text-sm text-muted-foreground">{email || '-'}</span>
  },
})

/**
 * Creates a URL/website column with link
 */
export const createUrlColumn = <T extends BaseEntity>(
  accessorKey: string = 'website',
  title: string = 'Website',
): ColumnDef<T> => ({
  accessorKey,
  header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
  cell: ({ row }) => {
    const url = row.getValue(accessorKey) as string | null
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        {url}
      </a>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    )
  },
})

/**
 * Creates an actions column with dropdown menu
 */
export const createActionsColumn = <T extends BaseEntity>(options: ActionsColumnOptions<T>): ColumnDef<T> => ({
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => {
    const item = row.original

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Edit action */}
          {(options.editRoute || options.onEdit) && (
            <>
              {options.editRoute ? (
                <DropdownMenuItem asChild>
                  <Link to={options.editRoute} params={{ [options.routeParam || 'id']: item.id }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => options.onEdit?.(item)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Copy ID action */}
          {options.onCopyId !== false && (
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(item.id)
                toast.success('ID copied to clipboard')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </DropdownMenuItem>
          )}

          {/* Additional custom actions */}
          {options.additionalActions?.map((action, index) => (
            <DropdownMenuItem key={index} onClick={() => action.onClick(item)} className={action.className}>
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}

          {/* Delete action */}
          {options.onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => options.onDelete?.(item)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
  enableHiding: false,
})

/**
 * Creates a handle column (like @username)
 */
export const createHandleColumn = <T extends BaseEntity>(accessorKey: string = 'handle'): ColumnDef<T> => ({
  accessorKey,
  header: ({ column }) => <DataTableColumnHeader column={column} title="Handle" />,
  cell: ({ row }) => {
    const handle = row.getValue(accessorKey) as string | undefined
    return handle ? (
      <span className="font-mono text-sm">{handle}</span>
    ) : (
      <span className="text-muted-foreground">-</span>
    )
  },
})
