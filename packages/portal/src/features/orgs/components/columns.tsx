import type { Org } from '@pzero/shared/pzero'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useOrgsStore } from '@/stores/orgs'

export const createColumns = (): ColumnDef<Org>[] => {
  const navigate = useNavigate()
  const orgsStore = useOrgsStore()

  return [
    {
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
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const name = row.getValue('name') as string
        const logoUrl = row.original.logo_url

        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={logoUrl || undefined} alt={name} />
              <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{row.original.handle}</span>
            </div>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string

        return (
          <Badge
            variant={status === 'active' ? 'default' : status === 'inactive' ? 'secondary' : 'destructive'}
            className="capitalize"
          >
            {status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'plan',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => {
        const plan = row.getValue('plan') as string

        return (
          <Badge
            variant={plan === 'enterprise' ? 'default' : plan === 'pro' ? 'secondary' : 'outline'}
            className="capitalize"
          >
            {plan}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => {
        const email = row.getValue('email') as string

        return <span className="text-sm text-muted-foreground">{email}</span>
      },
    },
    {
      accessorKey: 'website',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Website" />,
      cell: ({ row }) => {
        const website = row.getValue('website') as string | null

        return website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
            {website}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'c_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const createdAt = row.getValue('c_at') as string

        return <span className="text-sm text-muted-foreground">{format(new Date(createdAt), 'MMM dd, yyyy')}</span>
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onEdit={org => {
            // Navigate to edit page
            navigate({ to: `/dashboard/orgs/${org.id}/edit` })
          }}
          onDelete={async org => {
            // Confirm deletion
            if (confirm(`Are you sure you want to delete organization "${org.name}"?`)) {
              try {
                await orgsStore.deleteOrg(org.id)
                toast.success(`Organization "${org.name}" deleted successfully`)
                // Refresh the list
                await orgsStore.fetchOrgs()
              } catch (error) {
                console.error('Failed to delete org:', error)
                toast.error('Failed to delete organization')
              }
            }
          }}
          onCopy={async org => {
            // Create a duplicate organization
            try {
              const duplicate = {
                name: `${org.name} (Copy)`,
                handle: `${org.handle}-copy-${Date.now()}`,
                website: org.website,
                contact_email: org.contact_email,
                avatar_url: org.avatar_url,
              }
              await orgsStore.createOrg(duplicate)
              toast.success(`Organization "${org.name}" duplicated successfully`)
              // Refresh the list
              await orgsStore.fetchOrgs()
            } catch (error) {
              console.error('Failed to duplicate org:', error)
              toast.error('Failed to duplicate organization')
            }
          }}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
