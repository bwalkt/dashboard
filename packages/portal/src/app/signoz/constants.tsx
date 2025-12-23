'use client'

import type { HttpMethod } from '@pzero/shared/types'
import { format } from 'date-fns'
import { KVTabs } from '@/components/custom/kv-tabs'
import type { DataTableFilterField, Option, SheetField } from '@/components/data-table/types'
import { formatMilliseconds } from '@/lib/format'
import { getStatusColor } from '@/lib/request/status-code'
import { cn } from '@/lib/utils'
import { SheetTimingPhases } from './_components/sheet-timing-phases'
import type { ColumnFilterSchema, SignozTraceSchema } from './schema'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export const filterFields = [
  {
    label: 'Time Range',
    value: 'date',
    type: 'timerange',
    defaultOpen: true,
    commandDisabled: true,
  },
  {
    label: 'Service Name',
    value: 'serviceName',
    type: 'input',
  },
  {
    label: 'HTTP Method',
    value: 'http_method',
    type: 'checkbox',
    options: HTTP_METHODS.map(method => ({ label: method, value: `HTTP ${method}` })),
    component: (props: Option) => {
      return <span className="font-mono">{props.value}</span>
    },
  },
  {
    label: 'HTTP Host',
    value: 'http_host',
    type: 'input',
  },
  {
    label: 'HTTP URL',
    value: 'http_url',
    type: 'input',
  },
  {
    label: 'Status Code',
    value: 'responseStatusCode',
    type: 'checkbox',
    options: [
      { label: '200', value: 200 },
      { label: '201', value: 201 },
      { label: '400', value: 400 },
      { label: '401', value: 401 },
      { label: '403', value: 403 },
      { label: '404', value: 404 },
      { label: '500', value: 500 },
      { label: '502', value: 502 },
      { label: '503', value: 503 },
    ],
    component: (props: Option) => {
      if (typeof props.value === 'boolean') return null
      if (typeof props.value === 'undefined') return null
      if (typeof props.value === 'string') return null
      return <span className={cn('font-mono', getStatusColor(props.value).text)}>{props.value}</span>
    },
  },
  {
    label: 'Duration',
    value: 'durationMs',
    type: 'slider',
    min: 0,
    max: 60000, // 60 seconds
  },
  {
    label: 'DNS',
    value: 'timingPhases.dns',
    type: 'slider',
    min: 0,
    max: 5000,
  },
  {
    label: 'Connection',
    value: 'timingPhases.connection',
    type: 'slider',
    min: 0,
    max: 5000,
  },
  {
    label: 'TLS',
    value: 'timingPhases.tls',
    type: 'slider',
    min: 0,
    max: 5000,
  },
  {
    label: 'TTFB',
    value: 'timingPhases.ttfb',
    type: 'slider',
    min: 0,
    max: 5000,
  },
  {
    label: 'Transfer',
    value: 'timingPhases.transfer',
    type: 'slider',
    min: 0,
    max: 5000,
  },
] satisfies DataTableFilterField<ColumnFilterSchema>[]

export const sheetFields = [
  {
    id: 'trace_id',
    label: 'Trace ID',
    type: 'readonly',
    skeletonClassName: 'w-64',
  },
  {
    id: 'span_id',
    label: 'Span ID',
    type: 'readonly',
    skeletonClassName: 'w-64',
  },
  {
    id: 'date',
    label: 'Timestamp',
    type: 'timerange',
    component: (props: SignozTraceSchema) => format(new Date(props.date), 'LLL dd, y HH:mm:ss'),
    skeletonClassName: 'w-36',
  },
  {
    id: 'serviceName',
    label: 'Service Name',
    type: 'input',
    skeletonClassName: 'w-48',
  },
  {
    id: 'name',
    label: 'Span Name',
    type: 'input',
    skeletonClassName: 'w-56',
  },
  {
    id: 'http_method',
    label: 'HTTP Method',
    type: 'input',
    skeletonClassName: 'w-56',
  },
  {
    id: 'http_host',
    label: 'HTTP Host',
    type: 'input',
    skeletonClassName: 'w-48',
  },
  {
    id: 'http_url',
    label: 'HTTP URL',
    type: 'input',
    skeletonClassName: 'w-48',
  },
  {
    id: 'responseStatusCode',
    label: 'Status Code',
    type: 'checkbox',
    component: (props: SignozTraceSchema) => {
      const statusCode = props.responseStatusCode
      if (statusCode === undefined || statusCode === null) {
        return <span className="text-muted-foreground">-</span>
      }
      // Handle both string and number status codes
      const code = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode
      if (isNaN(code)) {
        return <span className="text-muted-foreground">{statusCode}</span>
      }
      return <span className={cn('font-mono', getStatusColor(code).text)}>{code}</span>
    },
    skeletonClassName: 'w-12',
  },
  {
    id: 'durationMs',
    label: 'Duration',
    type: 'slider',
    component: (props: SignozTraceSchema) => (
      <>
        {formatMilliseconds(props.durationMs)}
        <span className="text-muted-foreground">ms</span>
      </>
    ),
    skeletonClassName: 'w-16',
  },
  {
    id: 'timingPhases', // REMINDER: cannot be 'timing' as it is a property of the object
    label: 'Timing Phases',
    type: 'readonly',
    component: props => <SheetTimingPhases latency={props.durationMs} timing={props.timingPhases} />,
    className: 'flex-col items-start w-full gap-1',
  },
  {
    id: 'responseHeaders',
    label: 'Headers',
    type: 'readonly',
    component: props => {
      if (props.responseHeaders && Object.keys(props.responseHeaders).length === 0) return null
      // REMINDER: negative margin to make it look like the header is on the same level of the tab triggers
      return <KVTabs data={props.responseHeaders ?? {}} className="-mt-[22px]" />
    },
    className: 'flex-col items-start w-full gap-1',
  },
] satisfies SheetField<SignozTraceSchema, Record<string, unknown>>[]
