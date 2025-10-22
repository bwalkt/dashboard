import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generateAndCreateOrder } from '@/lib/generate-order'

/**
 * Provides actions and state for generating a single random order and refreshing the orders cache.
 *
 * @returns An object containing:
 * - `generateSingleOrder` — function that initiates creation of one random order
 * - `isCreatingSingle` — `true` while the create operation is pending, `false` otherwise
 * - `lastSingleResult` — the most recent mutation result returned by the create operation
 * - `singleError` — the error produced by the create operation, if any
 */
export function useGenerateOrders() {
  const queryClient = useQueryClient()

  // Mutation for creating a single random order
  const createRandomOrderMutation = useMutation({
    mutationFn: generateAndCreateOrder,
    onSuccess: result => {
      if (result.success) {
        toast.success('Random order created successfully!')
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      } else {
        toast.error('Failed to create random order')
        console.error('Order creation failed:', result.error)
      }
    },
    onError: error => {
      toast.error('Failed to create random order')
      console.error('Order creation error:', error)
    },
  })

  // Function to generate a single random order
  const generateSingleOrder = () => {
    createRandomOrderMutation.mutate()
  }

  return {
    // Actions
    generateSingleOrder,

    // State
    isCreatingSingle: createRandomOrderMutation.isPending,

    // Results
    lastSingleResult: createRandomOrderMutation.data,

    // Errors
    singleError: createRandomOrderMutation.error,
  }
}
