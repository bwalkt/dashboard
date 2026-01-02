// Authentication timing constants
export const AUTH_STALE_TIME_MS = 5 * 60 * 1000 // 5 minutes
export const AUTH_CACHE_TIME_MS = 10 * 60 * 1000 // 10 minutes

// These constants are used in:
// - useUser hook: React Query staleTime and gcTime
// - auth store: isStale() calculation for cache invalidation
