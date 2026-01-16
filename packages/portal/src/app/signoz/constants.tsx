'use client'

import type { HttpMethod } from '@pzero/shared/types'
import { KVTabs } from '@/components/custom/kv-tabs'
import type { DataTableFilterField, Option, SheetField } from '@/components/data-table/types'
import { getStatusColor } from '@/lib/request/status-code'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from './_components/collapsible-section'
import { SheetChallengeTimeline } from './_components/sheet-challenge-timeline'
import { SheetInfo } from './_components/sheet-info'
import type { SignozColumnFilterSchema, SignozTraceSchema } from './schema'

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
    options: HTTP_METHODS.map(method => ({ label: method, value: method })),
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
      { label: '200', value: '200' },
      { label: '201', value: '201' },
      { label: '400', value: '400' },
      { label: '401', value: '401' },
      { label: '403', value: '403' },
      { label: '404', value: '404' },
      { label: '500', value: '500' },
      { label: '502', value: '502' },
      { label: '503', value: '503' },
    ],
    component: (props: Option) => {
      if (typeof props.value === 'boolean') return null
      if (typeof props.value === 'undefined') return null
      if (typeof props.value === 'number') return null
      return <span className={cn('font-mono', getStatusColor(parseInt(props.value)).text)}>{props.value}</span>
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
] satisfies DataTableFilterField<SignozColumnFilterSchema>[]

export const sheetFields = [
  {
    id: 'info',
    label: '',
    type: 'readonly',
    component: (props: SignozTraceSchema) => (
      <CollapsibleSection title="Info" defaultOpen={true}>
        <SheetInfo trace={props} />
      </CollapsibleSection>
    ),
    className: 'flex-col items-start w-full',
  },
  {
    id: 'challengeTimeline',
    label: '',
    type: 'readonly',
    component: props => (
      <CollapsibleSection title="Challenge Chain" defaultOpen={true}>
        <SheetChallengeTimeline currentTrace={props} />
      </CollapsibleSection>
    ),
    className: 'flex-col items-start w-full',
  },
  {
    id: 'responseHeaders',
    label: '',
    type: 'readonly',
    component: props => {
      if (!props.responseHeaders || Object.keys(props.responseHeaders).length === 0) return null
      return (
        <CollapsibleSection title="Response Headers">
          <KVTabs data={props.responseHeaders} />
        </CollapsibleSection>
      )
    },
    className: 'flex-col items-start w-full',
  },
  {
    id: 'requestHeaders',
    label: '',
    type: 'readonly',
    component: props => {
      if (props.requestHeaders && Object.keys(props.requestHeaders).length === 0) return null
      return (
        <CollapsibleSection title="Request Headers">
          <KVTabs data={props.requestHeaders ?? {}} />
        </CollapsibleSection>
      )
    },
    className: 'flex-col items-start w-full',
  },
] satisfies SheetField<SignozTraceSchema, Record<string, unknown>>[]
