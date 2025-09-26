import { Button } from "@/components/ui/button";
import { useGenerateOrders } from "@/hooks/use-generate-orders";

/**
 * Simple button component for quick order generation
 * Can be easily added to existing pages
 */
export function QuickOrderGenerator() {
  const { generateSingleOrder, isCreatingSingle } = useGenerateOrders();

  return (
    <Button onClick={generateSingleOrder} disabled={isCreatingSingle} variant="outline" size="sm">
      {isCreatingSingle ? "Creating..." : "Generate Random Order"}
    </Button>
  );
}
