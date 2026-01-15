'use client'

import { useQuery } from '@tanstack/react-query'
import { SimpleTimeline, type SimpleTimelineItem } from '@/components/ui/timeline'
import { Skeleton } from '@/components/ui/skeleton'
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

// Get challenge IDs from a trace
function getChallengeIds(trace: SignozTraceSchema) {
  return {
    requestId: getHeader(trace.requestHeaders, CHALLENGE_HEADER_ID),
    responseId: getHeader(trace.responseHeaders, CHALLENGE_HEADER_ID),
    answer: getHeader(trace.requestHeaders, CHALLENGE_HEADER_ANSWER),
  }
}

interface SheetChallengeTimelineProps {
  currentTrace: SignozTraceSchema
}

export function SheetChallengeTimeline({ currentTrace }: SheetChallengeTimelineProps) {
  const current = getChallengeIds(currentTrace)

  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // Fetch prior trace by querying for response challenge ID = current request challenge ID
  const { data: priorData, isLoading: isLoadingPrior } = useQuery({
    queryKey: ['challenge-chain-prior', current.requestId],
    queryFn: async () => {
      if (!current.requestId) return { priorTrace: null }

      // Query for the trace that returned current.requestId as its response challenge
      const response = await queryTraces({
        filters: {
          startTime: oneDayAgo,
          endTime: now,
          responseChallengeId: current.requestId,
        },
        pagination: { limit: 1, offset: 0 },
      })

      const priorTrace = response.data?.[0] as SignozTraceSchema | undefined
      return { priorTrace: priorTrace || null }
    },
    enabled: !!current.requestId,
    staleTime: 60000,
  })

  // Fetch next trace to check if the next challenge was executed
  const { data: nextData, isLoading: isLoadingNext } = useQuery({
    queryKey: ['challenge-chain-next', current.responseId],
    queryFn: async () => {
      if (!current.responseId) return { nextExecuted: false }

      // Query for a trace that used current.responseId as its REQUEST challenge (meaning it was executed)
      const response = await queryTraces({
        filters: {
          startTime: oneDayAgo,
          endTime: now,
          requestChallengeId: current.responseId, // Find trace where this challenge was used
        },
        pagination: { limit: 1, offset: 0 },
      })

      // If we find a trace, it means the next challenge was used (executed)
      return { nextExecuted: (response.data?.length ?? 0) > 0 }
    },
    enabled: !!current.responseId && current.responseId !== current.requestId,
    staleTime: 60000,
  })

  const isLoading = isLoadingPrior || isLoadingNext

  // If no challenge IDs found, don't render anything
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
  const priorChallengeId = priorTrace ? getChallengeIds(priorTrace).requestId : undefined
  const nextExecuted = nextData?.nextExecuted ?? false

  // Add prior challenge (A) if found - Blue (previous)
  if (priorChallengeId) {
    items.push({
      id: `prior-${priorChallengeId}`,
      label: priorChallengeId,
      sublabel: 'Prior Challenge',
      status: 'previous',
    })
  }

  // Add current request challenge (B) - Green (current)
  if (current.requestId) {
    items.push({
      id: `req-${current.requestId}`,
      label: current.requestId,
      sublabel: current.answer ? `Answer: ${current.answer}` : 'Current Challenge',
      status: 'current',
    })
  }

  // Add next challenge (C) from response - Blue if executed, Gray if not
  if (current.responseId && current.responseId !== current.requestId) {
    items.push({
      id: `res-${current.responseId}`,
      label: current.responseId,
      sublabel: nextExecuted ? 'Next Challenge (Executed)' : 'Next Challenge (Pending)',
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
