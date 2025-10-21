import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateAndCreateOrder } from "@/lib/generate-order";

/**
 * Hook for generating and creating random orders
 * Provides easy-to-use functions for components
 */
export function useGenerateOrders() {
  const queryClient = useQueryClient();

  // Mutation for creating a single random order
  const createRandomOrderMutation = useMutation({
    mutationFn: generateAndCreateOrder,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Random order created successfully!");
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        toast.error("Failed to create random order");
        console.error("Order creation failed:", result.error);
      }
    },
    onError: (error) => {
      toast.error("Failed to create random order");
      console.error("Order creation error:", error);
    },
  });

  // Function to generate a single random order
  const generateSingleOrder = () => {
    createRandomOrderMutation.mutate();
  };

  return {
    // Actions
    generateSingleOrder,

    // State
    isCreatingSingle: createRandomOrderMutation.isPending,

    // Results
    lastSingleResult: createRandomOrderMutation.data,

    // Errors
    singleError: createRandomOrderMutation.error,
  };
}
