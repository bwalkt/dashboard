import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateAndCreateOrders } from "@/lib/generate-order";

interface AutoGenerateConfig {
  intervalMs?: number;
  minOrdersPerBatch?: number;
  maxOrdersPerBatch?: number;
}

interface AutoGenerateState {
  isRunning: boolean;
  totalGenerated: number;
  totalSuccessful: number;
  totalFailed: number;
  lastBatchResult?: {
    count: number;
    successful: number;
    failed: number;
    timestamp: Date;
  };
}

/**
 * Hook for automatically generating random orders at intervals
 * Uses React Query for state management and error handling
 */
export function useAutoGenerateOrders(config: AutoGenerateConfig = {}) {
  const {
    intervalMs = 5000, // 5 seconds
    minOrdersPerBatch = 1,
    maxOrdersPerBatch = 3,
  } = config;

  const [state, setState] = useState<AutoGenerateState>({
    isRunning: false,
    totalGenerated: 0,
    totalSuccessful: 0,
    totalFailed: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const triggerGenerationRef = useRef<(() => void) | undefined>(undefined);
  const queryClient = useQueryClient();

  // Mutation for creating random orders
  const createOrdersMutation = useMutation({
    mutationFn: ({ count }: { count: number }) => generateAndCreateOrders(count),
    onSuccess: (result, variables) => {
      const { summary } = result;

      setState((prev) => ({
        ...prev,
        totalGenerated: prev.totalGenerated + variables.count,
        totalSuccessful: prev.totalSuccessful + summary.successful,
        totalFailed: prev.totalFailed + summary.failed,
        lastBatchResult: {
          count: variables.count,
          successful: summary.successful,
          failed: summary.failed,
          timestamp: new Date(),
        },
      }));

      // Only show toast for significant failures (all orders failed)
      if (summary.failed === variables.count && summary.successful === 0) {
        toast.error(`Failed to generate ${variables.count} orders`);
      }

      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error, variables) => {
      setState((prev) => ({
        ...prev,
        totalGenerated: prev.totalGenerated + variables.count,
        totalFailed: prev.totalFailed + variables.count,
        lastBatchResult: {
          count: variables.count,
          successful: 0,
          failed: variables.count,
          timestamp: new Date(),
        },
      }));

      // Show error toast for API failures
      toast.error(`Failed to auto-generate ${variables.count} orders`);
      console.error("Auto-generation error:", error);
    },
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Function to generate a random number of orders
  const generateRandomCount = useCallback(() => {
    return Math.floor(Math.random() * (maxOrdersPerBatch - minOrdersPerBatch + 1)) + minOrdersPerBatch;
  }, [minOrdersPerBatch, maxOrdersPerBatch]);

  // Function to trigger order generation
  const triggerGeneration = useCallback(() => {
    if (!isRunningRef.current) {
      return;
    }

    const count = generateRandomCount();
    createOrdersMutation.mutate({ count });
  }, [generateRandomCount]);

  // Update the ref whenever triggerGeneration changes
  triggerGenerationRef.current = triggerGeneration;

  // Start auto-generation
  const start = useCallback(() => {
    if (state.isRunning) return;

    isRunningRef.current = true;
    setState((prev) => ({ ...prev, isRunning: true }));

    // Start the interval
    intervalRef.current = setInterval(() => {
      triggerGenerationRef.current?.();
    }, intervalMs);

    // Trigger first generation immediately
    triggerGenerationRef.current?.();

    toast.info("Auto-order generation started");
  }, [state.isRunning, intervalMs]);

  // Stop auto-generation
  const stop = useCallback(() => {
    if (!state.isRunning) return;

    isRunningRef.current = false;
    setState((prev) => ({ ...prev, isRunning: false }));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    toast.info("Auto-order generation stopped");
  }, [state.isRunning]);

  // Debug effect to track interval changes (removed - not needed)

  // Toggle auto-generation
  const toggle = useCallback(() => {
    if (state.isRunning) {
      stop();
    } else {
      start();
    }
  }, [state.isRunning, start, stop]);

  // Reset statistics
  const reset = useCallback(() => {
    isRunningRef.current = false;
    setState({
      isRunning: false,
      totalGenerated: 0,
      totalSuccessful: 0,
      totalFailed: 0,
    });

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    toast.info("Auto-generation statistics reset");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Note: Removed auto-start effect since we're using manual toggle control
  // The enabled prop is not being used for automatic start/stop

  return {
    // State
    ...state,
    isGenerating: createOrdersMutation.isPending,

    // Actions
    start,
    stop,
    toggle,
    reset,

    // Statistics
    successRate: state.totalGenerated > 0 ? (state.totalSuccessful / state.totalGenerated) * 100 : 0,

    // Configuration
    config: {
      intervalMs,
      minOrdersPerBatch,
      maxOrdersPerBatch,
    },

    // Error handling
    error: createOrdersMutation.error,
  };
}
