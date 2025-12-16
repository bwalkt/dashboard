'use client'

import { format } from 'date-fns'
import type { DataTableFilterField, Option, SheetField } from '@/components/data-table/types'
import { formatMilliseconds } from '@/lib/format'
import { getStatusColor } from '@/lib/request/status-code'
import { cn } from '@/lib/utils'
import type { HttpMethod } from '@pzero/shared/types'
import type { SignozTraceSchema } from './schema'

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
    value: 'name',
    type: 'checkbox',
    options: HTTP_METHODS.map(method => ({ label: method, value: `HTTP ${method}` })),
    component: (props: Option) => {
      return <span className="font-mono">{props.value}</span>
    },
  },
] satisfies DataTableFilterField<SignozTraceSchema>[]

export const sheetFields = [
  {
    id: 'trace_id',
    label: 'Trace ID',
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
    label: 'Operation',
    type: 'input',
    skeletonClassName: 'w-56',
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
    id: 'responseStatusCode',
    label: 'Status Code',
    type: 'checkbox',
    component: (props: SignozTraceSchema) => {
      if (props.responseStatusCode === undefined || props.responseStatusCode === null) {
        return <span className="text-muted-foreground">-</span>
      }
      return <span className={cn('font-mono', getStatusColor(props.responseStatusCode).text)}>{props.responseStatusCode}</span>
    },
    skeletonClassName: 'w-12',
  },
] satisfies SheetField<SignozTraceSchema, Record<string, unknown>>[]
