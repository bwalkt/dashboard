import { Button } from '@/components/ui/button'
import { useGenerateOrders } from '@/hooks/use-generate-orders'

/**
 * Renders a small outlined button that triggers generation of a single random order.
 *
 * @returns A button that calls the order generator when clicked; the button is disabled while an order is being created. The label is "Creating..." during creation and "Generate Random Order" otherwise.
 */
export function QuickOrderGenerator() {
  const { generateSingleOrder, isCreatingSingle } = useGenerateOrders()

  return (
    <Button className="w-fit" onClick={generateSingleOrder} disabled={isCreatingSingle} variant="outline" size="sm">
      {isCreatingSingle ? 'Creating...' : 'Generate Random Order'}
    </Button>
  )
}
