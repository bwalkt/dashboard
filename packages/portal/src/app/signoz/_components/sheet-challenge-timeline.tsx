'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { SimpleTimeline, type SimpleTimelineItem } from '@/components/ui/timeline'
import { queryTraces } from '@/services/signoz.service'
import type { SignozTraceSchema } from '../schema'

// Challenge header names (matching packages/rust-wasm-filter/src/lib.rs)
const CHALLENGE_HEADER_ID = 'x-challenge-id'
const CHALLENGE_HEADER_ANSWER = 'x-challenge-answer'

// Extract challenge ID from headers (case-insensitive)
function getHeader(headers: Record<string, string> | undefined, key: string): string | undefined {
  if (!headers) return undefined
  if (headers[key]) return headers[key]
  const lowerKey = key.toLowerCase()
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lowerKey) return v
  }
  return undefined
}

// Extract timestamp from UUIDv7 challenge ID (first 48 bits are Unix ms timestamp)
function getUuidTimestamp(uuid: string | undefined): number {
  if (!uuid) return 0
  try {
    // UUIDv7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
    // First 48 bits (12 hex chars) are the timestamp
    const hex = uuid.replace(/-/g, '').slice(0, 12)
    return parseInt(hex, 16)
  } catch {
    return 0
  }
}

// Get challenge IDs from a trace
function getChallengeIds(trace: SignozTraceSchema) {
  return {
    requestId: getHeader(trace.requestHeaders, CHALLENGE_HEADER_ID),
    responseId: getHeader(trace.responseHeaders, CHALLENGE_HEADER_ID),
    answer: getHeader(trace.requestHeaders, CHALLENGE_HEADER_ANSWER),
  }
}

// Extract significant URL path (after /proxy, without query params)
function getSignificantPath(trace: SignozTraceSchema | null | undefined): string | undefined {
  if (!trace?.http_url) return undefined

  try {
    const url = new URL(trace.http_url, 'http://localhost')
    let path = url.pathname

    // Remove /proxy prefix if present
    if (path.startsWith('/proxy')) {
      path = path.slice(6) // Remove '/proxy'
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path
    }

    return path || '/'
  } catch {
    // If URL parsing fails, try simple string manipulation
    let path = trace.http_url

    // Remove query params
    const queryIndex = path.indexOf('?')
    if (queryIndex !== -1) {
      path = path.slice(0, queryIndex)
    }

    // Remove /proxy prefix
    const proxyIndex = path.indexOf('/proxy')
    if (proxyIndex !== -1) {
      path = path.slice(proxyIndex + 6)
    }

    return path || '/'
  }
}

interface SheetChallengeTimelineProps {
  currentTrace: SignozTraceSchema
}

export function SheetChallengeTimeline({ currentTrace }: SheetChallengeTimelineProps) {
  const current = getChallengeIds(currentTrace)

  // Use a time window around the current trace (±10 minutes)
  const currentTraceTime = currentTrace.timestamp
  const tenMinutes = 10 * 60 * 1000
  const startTime = currentTraceTime - tenMinutes
  const endTime = currentTraceTime + tenMinutes

  // Fetch prior trace by querying for response challenge ID = current request challenge ID
  const { data: priorData, isLoading: isLoadingPrior } = useQuery({
    queryKey: ['challenge-chain-prior', current.requestId, currentTrace.trace_id],
    queryFn: async () => {
      if (!current.requestId) return { priorTrace: null }

      // Query for traces that returned current.requestId as response challenge
      const response = await queryTraces({
        filters: {
          startTime,
          endTime,
          responseChallengeId: current.requestId,
        },
        pagination: { limit: 10, offset: 0 },
      })

      // Find the trace that provided the challenge (prior)
      // Signoz returns data sorted by timestamp desc, so filter and take first match
      const traces = (response.data || []) as SignozTraceSchema[]
      const priorTrace = traces.find(t => t.trace_id !== currentTrace.trace_id) || null

      return { priorTrace }
    },
    enabled: !!current.requestId,
    staleTime: 60000,
  })

  // Fetch next trace to check if the next challenge was executed
  const { data: nextData, isLoading: isLoadingNext } = useQuery({
    queryKey: ['challenge-chain-next', current.responseId, currentTrace.trace_id],
    queryFn: async () => {
      if (!current.responseId) return { nextTrace: null }

      // Query for traces that used current.responseId as request challenge
      const response = await queryTraces({
        filters: {
          startTime,
          endTime,
          requestChallengeId: current.responseId,
        },
        pagination: { limit: 10, offset: 0 },
      })

      // Find the trace that used the challenge (next)
      // Signoz returns data sorted by timestamp desc, so filter and take first match
      const traces = (response.data || []) as SignozTraceSchema[]
      const nextTrace = traces.find(t => t.trace_id !== currentTrace.trace_id) || null

      return { nextTrace }
    },
    enabled: !!current.responseId && current.responseId !== current.requestId,
    staleTime: 60000,
  })

  const isLoading = isLoadingPrior || isLoadingNext

  // If no challenge IDs found at all, don't render anything
  // (but still show if we have at least a response ID - like initial /auth/me calls)
  if (!current.requestId && !current.responseId) {
    return <span className="text-muted-foreground text-xs">No challenge data</span>
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    )
  }

  // Build the chain: A (prior) → B (current request) → C (current response/next)
  const items: SimpleTimelineItem[] = []
  const priorTrace = priorData?.priorTrace
  const priorChallengeIds = priorTrace ? getChallengeIds(priorTrace) : null
  const nextTrace = nextData?.nextTrace
  const nextExecuted = !!nextTrace

  // Add prior trace if found - Blue (previous)
  // Show prior's request challenge ID, or if none (initial call), show "Initial"
  if (priorTrace) {
    const priorLabel = priorChallengeIds?.requestId || 'Initial'
    items.push({
      id: `prior-${priorLabel}`,
      label: priorLabel,
      sublabel: getSignificantPath(priorTrace) || 'Prior',
      status: 'previous',
    })
  }

  // Add current trace (B) - Green (current)
  // Always show current trace, use request challenge ID or "Initial" if none
  const currentLabel = current.requestId || 'Initial'
  items.push({
    id: `current-${currentTrace.trace_id}`,
    label: currentLabel,
    sublabel: getSignificantPath(currentTrace) || 'Current',
    status: 'current',
  })

  // Add next challenge (C) from response - Blue if executed, Gray if not
  if (current.responseId && current.responseId !== current.requestId) {
    items.push({
      id: `res-${current.responseId}`,
      label: current.responseId,
      sublabel: nextExecuted ? getSignificantPath(nextTrace) || 'Executed' : 'Pending',
      status: nextExecuted ? 'executed' : 'pending',
    })
  }

  // Warn if same ID in request and response
  if (current.requestId && current.responseId && current.requestId === current.responseId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Challenge ID:</span>
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{current.requestId}</code>
        </div>
        <span className="text-xs text-amber-500">Same ID in request and response (potential issue)</span>
      </div>
    )
  }

  if (items.length === 0) {
    return <span className="text-muted-foreground text-xs">No challenge chain found</span>
  }

  return (
    <div className="w-full">
      <SimpleTimeline items={items} />
    </div>
  )
}
