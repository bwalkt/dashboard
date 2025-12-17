'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { TextWithTooltip } from '@/components/custom/text-with-tooltip'
import { DataTableColumnLatency } from '@/components/data-table/data-table-column/data-table-column-latency'
import { DataTableColumnStatusCode } from '@/components/data-table/data-table-column/data-table-column-status-code'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { HoverCardTimestamp } from './_components/hover-card-timestamp'
import type { SignozTraceSchema } from './schema'

export const columns: ColumnDef<SignozTraceSchema>[] = [
  {
    id: 'date',
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
    cell: ({ row }) => {
      const date = row.getValue<SignozTraceSchema['date']>('date')
      return <HoverCardTimestamp date={date} />
    },
    enableResizing: false,
    size: 200,
    minSize: 200,
    meta: {
      headerClassName: 'w-[--header-date-size] max-w-[--header-date-size] min-w-[--header-date-size]',
      cellClassName: 'font-mono w-[--col-date-size] max-w-[--col-date-size] min-w-[--col-date-size]',
    },
  },
  {
    id: 'http_method',
    accessorKey: 'http_method',
    header: 'HTTP Method',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_method']>('http_method')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
    size: 200,
    minSize: 200,
    meta: {
      cellClassName: 'font-mono w-[--col-name-size] max-w-[--col-name-size]',
      headerClassName: 'min-w-[--header-name-size] w-[--header-name-size]',
    },
  },
  {
    id: 'responseStatusCode',
    accessorKey: 'responseStatusCode',
    header: 'Status',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['responseStatusCode']>('responseStatusCode')
      if (value === undefined || value === null) {
        return <span className="text-muted-foreground">-</span>
      }
      // DataTableColumnStatusCode handles both string and number
      return <DataTableColumnStatusCode value={value} />
    },
    enableResizing: false,
    size: 60,
    minSize: 60,
    meta: {
      headerClassName: 'w-[--header-status-size] max-w-[--header-status-size] min-w-[--header-status-size]',
      cellClassName: 'font-mono w-[--col-status-size] max-w-[--col-status-size] min-w-[--col-status-size]',
    },
  },
  {
    id: 'trace_id',
    accessorKey: 'trace_id',
    header: 'Trace ID',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['trace_id']>('trace_id')
      return <TextWithTooltip text={value} />
    },
    size: 130,
    minSize: 130,
    meta: {
      label: 'Trace ID',
      cellClassName: 'font-mono w-[--col-trace-id-size] max-w-[--col-trace-id-size] min-w-[--col-trace-id-size]',
      headerClassName: 'min-w-[--header-trace-id-size] w-[--header-trace-id-size] max-w-[--header-trace-id-size]',
    },
  },
  {
    id: 'serviceName',
    accessorKey: 'serviceName',
    header: 'Service',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['serviceName']>('serviceName')
      return <TextWithTooltip text={value} />
    },
    size: 150,
    minSize: 150,
    meta: {
      cellClassName: 'font-mono w-[--col-service-size] max-w-[--col-service-size]',
      headerClassName: 'min-w-[--header-service-size] w-[--header-service-size]',
    },
  },
  {
    id: 'http_host',
    accessorKey: 'http_host',
    header: 'Host',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_host']>('http_host')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
  },
  {
    id: 'http_url',
    accessorKey: 'http_url',
    header: 'URL',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_url']>('http_url')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
  },
  {
    id: 'durationMs',
    accessorKey: 'durationMs',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['durationMs']>('durationMs')
      return <DataTableColumnLatency value={value} />
    },
    enableResizing: false,
    size: 110,
    minSize: 110,
    meta: {
      headerClassName: 'w-[--header-duration-size] max-w-[--header-duration-size] min-w-[--header-duration-size]',
      cellClassName: 'font-mono w-[--col-duration-size] max-w-[--col-duration-size] min-w-[--col-duration-size]',
    },
  },
]
