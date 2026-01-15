'use client'

import { HoverCardPortal } from '@radix-ui/react-hover-card'
import type { ColumnDef } from '@tanstack/react-table'
import { TextWithTooltip } from '@/components/custom/text-with-tooltip'
import { DataTableColumnLatency } from '@/components/data-table/data-table-column/data-table-column-latency'
import { DataTableColumnStatusCode } from '@/components/data-table/data-table-column/data-table-column-status-code'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { getTimingColor, getTimingLabel, getTimingPercentage, TimingPhase, timingPhases } from '@/lib/request/timing'
import { cn } from '@/lib/utils'
import { HoverCardTimestamp } from './_components/hover-card-timestamp'
import type { SignozTraceSchema } from './schema'

export const columns: ColumnDef<SignozTraceSchema>[] = [
  // 1. Timestamp
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
  // 2. Method
  {
    id: 'http_method',
    accessorKey: 'http_method',
    header: 'Method',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_method']>('http_method')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
    enableResizing: false,
    size: 80,
    minSize: 80,
    meta: {
      cellClassName:
        'font-mono w-[--col-http_method-size] max-w-[--col-http_method-size] min-w-[--col-http_method-size]',
      headerClassName:
        'w-[--header-http_method-size] max-w-[--header-http_method-size] min-w-[--header-http_method-size]',
    },
  },
  // 3. Status
  {
    id: 'responseStatusCode',
    accessorKey: 'responseStatusCode',
    header: 'Status',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['responseStatusCode']>('responseStatusCode')
      if (value === undefined || value === null) {
        return <span className="text-muted-foreground">-</span>
      }
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
  // 4. URL
  {
    id: 'http_url',
    accessorKey: 'http_url',
    header: 'URL',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_url']>('http_url')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
    enableResizing: false,
    size: 500,
    minSize: 500,
    meta: {
      cellClassName: 'font-mono w-[--col-url-size] max-w-[--col-url-size] min-w-[--col-url-size]',
      headerClassName: 'w-[--header-url-size] max-w-[--header-url-size] min-w-[--header-url-size]',
    },
  },
  // 5. Timing Phase
  {
    id: 'timingPhases',
    accessorKey: 'timingPhases',
    header: () => <div className="whitespace-nowrap">Timing Phase</div>,
    cell: ({ row }) => {
      const timing = row.getValue<SignozTraceSchema['timingPhases']>('timingPhases') as Partial<
        Record<TimingPhase, number>
      >
      const latency = row.getValue<SignozTraceSchema['durationMs']>('durationMs')
      const percentage = getTimingPercentage(timing, latency)
      return (
        <HoverCard openDelay={50} closeDelay={50}>
          <HoverCardTrigger className="opacity-70 hover:opacity-100 data-[state=open]:opacity-100" asChild>
            <div className="flex">
              {Object.entries(timing).map(([key, value]) => {
                const numValue = typeof value === 'number' ? value : 0
                return (
                  <div
                    key={key}
                    className={cn(getTimingColor(key as TimingPhase), 'h-4')}
                    style={{ width: isNaN(numValue) || numValue === 0 ? 0 : `${(numValue / latency) * 100}%` }}
                  />
                )
              })}
            </div>
          </HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent side="bottom" align="end" className="z-10 w-auto p-2">
              <div className="flex flex-col gap-1">
                {timingPhases.map(phase => {
                  const color = getTimingColor(phase)
                  const percentageValue = percentage[phase]
                  const value = timing[phase]
                  const formattedValue =
                    value !== undefined
                      ? new Intl.NumberFormat('en-US', {
                          maximumFractionDigits: 3,
                        }).format(value)
                      : '-'
                  return (
                    <div key={phase} className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn(color, 'h-2 w-2 rounded-full')} />
                        <div className="font-mono uppercase text-accent-foreground">{getTimingLabel(phase)}</div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-mono text-muted-foreground">{percentageValue}</div>
                        <div className="font-mono">
                          {value === undefined || isNaN(value) ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            formattedValue
                          )}
                          {value !== undefined && !isNaN(value) ? (
                            <span className="text-muted-foreground">ms</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </HoverCardContent>
          </HoverCardPortal>
        </HoverCard>
      )
    },
    enableResizing: false,
    size: 130,
    minSize: 130,
    meta: {
      label: 'Timing Phase',
      headerClassName: 'w-[--header-timing-size] max-w-[--header-timing-size] min-w-[--header-timing-size]',
      cellClassName: 'font-mono w-[--col-timing-size] max-w-[--col-timing-size] min-w-[--col-timing-size]',
    },
  },
  // 6. Duration
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
  // 7. Service
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
  // 8. Host
  {
    id: 'http_host',
    accessorKey: 'http_host',
    header: 'Host',
    cell: ({ row }) => {
      const value = row.getValue<SignozTraceSchema['http_host']>('http_host')
      if (!value) return <span className="text-muted-foreground">-</span>
      return <TextWithTooltip text={value} />
    },
    enableResizing: false,
    size: 150,
    minSize: 150,
    meta: {
      cellClassName: 'font-mono w-[--col-host-size] max-w-[--col-host-size] min-w-[--col-host-size]',
      headerClassName: 'w-[--header-host-size] max-w-[--header-host-size] min-w-[--header-host-size]',
    },
  },
  // 9. Trace ID
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
  // Hidden timing phase columns for filtering
  {
    id: 'timingPhases.dns',
    accessorFn: row => row.timingPhases?.['timing.dns'],
    enableHiding: true,
  },
  {
    id: 'timingPhases.connection',
    accessorFn: row => row.timingPhases?.['timing.connection'],
    enableHiding: true,
  },
  {
    id: 'timingPhases.tls',
    accessorFn: row => row.timingPhases?.['timing.tls'],
    enableHiding: true,
  },
  {
    id: 'timingPhases.ttfb',
    accessorFn: row => row.timingPhases?.['timing.ttfb'],
    enableHiding: true,
  },
  {
    id: 'timingPhases.transfer',
    accessorFn: row => row.timingPhases?.['timing.transfer'],
    enableHiding: true,
  },
]
