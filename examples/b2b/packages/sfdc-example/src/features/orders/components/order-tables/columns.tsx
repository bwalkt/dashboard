import { ColumnDef } from '@tanstack/react-table'
import { Text } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header'
import { Order } from '@/types'
import { CellAction } from './cell-action'
import { PAYMENT_OPTIONS, STATUS_OPTIONS } from './options'

export const columns: ColumnDef<Order>[] = [
  {
    id: 'OrderNumber',
    accessorKey: 'OrderNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order Number" />,
    cell: ({ cell }) => <div className="font-mono text-sm">{cell.getValue<Order['OrderNumber']>()}</div>,
    meta: {
      label: 'Order Number',
      placeholder: 'Search by order number...',
      variant: 'text',
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: 'Name',
    accessorKey: 'Name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order Name" />,
    cell: ({ cell }) => <div className="font-medium">{cell.getValue<Order['Name']>() || 'N/A'}</div>,
    meta: {
      label: 'Order Name',
      placeholder: 'Search orders...',
      variant: 'text',
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: 'Status',
    accessorKey: 'Status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ cell }) => {
      const status = cell.getValue<Order['Status']>()
      const getStatusVariant = (status: string) => {
        switch (status) {
          case 'Draft':
            return 'secondary'
          case 'Activated':
            return 'default'
          case 'Processing':
            return 'outline'
          case 'Completed':
            return 'default'
          case 'Shipped':
            return 'default'
          default:
            return 'secondary'
        }
      }

      return (
        <Badge variant={getStatusVariant(status)} className="capitalize">
          {status}
        </Badge>
      )
    },
    enableColumnFilter: true,
    meta: {
      label: 'status',
      variant: 'select',
      options: STATUS_OPTIONS,
    },
  },
  {
    id: 'TotalAmount',
    accessorKey: 'TotalAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Amount" />,
    cell: ({ cell }) => {
      const amount = cell.getValue<Order['TotalAmount']>()
      if (!amount) return <div>N/A</div>
      return <div className="font-medium">${amount.toLocaleString()}</div>
    },
  },
  {
    id: 'Customer_Name__c',
    accessorKey: 'Customer_Name__c',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ cell }) => {
      const customerName = cell.getValue<Order['Customer_Name__c']>()
      return <div>{customerName || 'N/A'}</div>
    },
  },
  {
    id: 'Payment__c',
    accessorKey: 'Payment__c',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Method" />,
    cell: ({ cell }) => {
      const payment = cell.getValue<Order['Payment__c']>()
      if (!payment) return <div>N/A</div>
      return (
        <Badge variant="outline" className="capitalize">
          {payment}
        </Badge>
      )
    },
    enableColumnFilter: true,
    meta: {
      label: 'payment method',
      variant: 'select',
      options: PAYMENT_OPTIONS,
    },
  },
  {
    id: 'EffectiveDate',
    accessorKey: 'EffectiveDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Effective Date" />,
    cell: ({ cell }) => {
      const date = cell.getValue<Order['EffectiveDate']>()
      if (!date) return <div>N/A</div>
      return <div>{new Date(date).toLocaleDateString()}</div>
    },
  },
  {
    id: 'CreatedDate',
    accessorKey: 'CreatedDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created Date" />,
    cell: ({ cell }) => {
      const date = cell.getValue<Order['CreatedDate']>()
      if (!date) return <div>N/A</div>
      return <div>{new Date(date).toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'Description',
    header: 'Description',
    cell: ({ cell }) => {
      const description = cell.getValue<Order['Description']>()
      return (
        <div className="max-w-xs truncate" title={description ?? undefined}>
          {description || 'N/A'}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />,
  },
]
