import type { Org } from '@pzero/shared/pzero'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef, Row } from '@tanstack/react-table'
import React from 'react'
import { toast } from 'sonner'
import {
  createDateColumn,
  createEmailColumn,
  createNameColumn,
  createSelectColumn,
  createStatusColumn,
  createUrlColumn,
} from '@/components/data-table/common-columns'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { Badge } from '@/components/ui/badge'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useOrgsStore } from '@/stores/orgs'

// Separate component for actions cell to manage dialog state
function ActionsCell({ row }: { row: Row<Org> }) {
  const navigate = useNavigate()
  const orgsStore = useOrgsStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false)
  const org = row.original

  const handleDelete = async () => {
    try {
      await orgsStore.deleteOrg(org.id)
      toast.success(`Organization "${org.name}" deleted successfully`)
      await orgsStore.fetchOrgs()
    } catch (error) {
      console.error('Failed to delete org:', error)
      toast.error('Failed to delete organization')
    }
  }

  const handleCopy = async () => {
    try {
      const duplicate = {
        name: `${org.name} (Copy)`,
        handle: `${org.handle}-copy-${Date.now()}`,
        website: org.website,
        email: org.email,
        logo_url: org.logo_url,
        status: org.status,
        plan: org.plan,
        dscr: org.dscr,
      }
      // @ts-ignore
      await orgsStore.createOrg(duplicate)
      toast.success(`Organization "${org.name}" duplicated successfully`)
      await orgsStore.fetchOrgs()
    } catch (error) {
      console.error('Failed to duplicate org:', error)
      toast.error('Failed to duplicate organization')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Organization"
        description={`Are you sure you want to delete organization "${org.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <ConfirmationDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        title="Duplicate Organization"
        description={`Create a copy of "${org.name}"?`}
        confirmText="Duplicate"
        cancelText="Cancel"
        onConfirm={handleCopy}
      />
      <DataTableRowActions
        row={row}
        onEdit={() => {
          navigate({ to: '/orgs/edit/$orgId', params: { orgId: org.id } })
        }}
        onDelete={() => setDeleteDialogOpen(true)}
        onCopy={() => setDuplicateDialogOpen(true)}
      />
    </div>
  )
}

export const createColumns = (): ColumnDef<Org>[] => {
  return [
    // Select checkbox column
    createSelectColumn<Org>(),

    // Organization name with logo and handle
    createNameColumn<Org>({
      accessorKey: 'name',
      showAvatar: true,
      avatarField: 'logo_url',
      subTextAccessor: org => org.handle,
    }),

    // Status column
    createStatusColumn<Org>({
      variants: {
        ACTIVE: 'default',
        INACTIVE: 'secondary',
        SUSPENDED: 'destructive',
        BLOCKED: 'destructive',
      },
    }),

    // Plan column with custom badges
    {
      accessorKey: 'plan',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => {
        const plan = row.getValue('plan') as string
        return (
          <Badge variant={plan === 'ENTERPRISE' ? 'default' : plan === 'PRO' ? 'secondary' : 'outline'}>{plan}</Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },

    // Email column
    createEmailColumn<Org>(),

    // Website column
    createUrlColumn<Org>(),

    // Created date column
    createDateColumn<Org>({
      accessorKey: 'c_at',
      title: 'Created',
      dateFormat: 'MMM dd, yyyy',
    }),

    // Actions column (keeping existing implementation)
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <ActionsCell row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
