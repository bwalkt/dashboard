'use client'

import { format } from 'date-fns'
import { formatMilliseconds } from '@/lib/format'
import { getStatusColor } from '@/lib/request/status-code'
import { cn } from '@/lib/utils'
import type { SignozTraceSchema } from '../schema'
import { SheetTimingPhases } from './sheet-timing-phases'

interface SheetInfoProps {
  trace: SignozTraceSchema
}

interface InfoRowProps {
  label: string
  children: React.ReactNode
  className?: string
}

function InfoRow({ label, children, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1.5 border-b border-border/50 last:border-0', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono text-right">{children}</span>
    </div>
  )
}

export function SheetInfo({ trace }: SheetInfoProps) {
  const statusCode = trace.responseStatusCode
  const code = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode

  return (
    <div className="space-y-0">
      <InfoRow label="Trace ID">
        <span className="truncate max-w-[200px]">{trace.trace_id}</span>
      </InfoRow>
      <InfoRow label="Span ID">
        <span className="truncate max-w-[200px]">{trace.span_id}</span>
      </InfoRow>
      <InfoRow label="Timestamp">{format(new Date(trace.date), 'LLL dd, y HH:mm:ss')}</InfoRow>
      <InfoRow label="Service Name">{trace.serviceName}</InfoRow>
      <InfoRow label="HTTP Method">{trace.http_method}</InfoRow>
      <InfoRow label="HTTP Host">{trace.http_host}</InfoRow>
      <InfoRow label="HTTP URL">
        <span className="truncate max-w-[200px]" title={trace.http_url}>
          {trace.http_url}
        </span>
      </InfoRow>
      <InfoRow label="Status Code">
        {code && !isNaN(code) ? (
          <span className={cn('font-mono', getStatusColor(code).text)}>{code}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </InfoRow>
      <InfoRow label="Duration">
        {formatMilliseconds(trace.durationMs)}
        <span className="text-muted-foreground ml-0.5">ms</span>
      </InfoRow>
      <div className="pt-2">
        <SheetTimingPhases latency={trace.durationMs} timing={trace.timingPhases} />
      </div>
    </div>
  )
}
