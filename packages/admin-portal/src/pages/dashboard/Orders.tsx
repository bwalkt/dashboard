import { useNavigate } from 'react-router-dom'
import { AutoGenerateToggle } from '@/components/auto-order-generator'
import { Icons } from '@/components/icons'
import { QuickOrderGenerator } from '@/components/order-generator'
import { Button } from '@/components/ui/button'
import OrderListingPage from '@/features/orders/components/order-listing'

/**
 * Renders the Orders management page for the dashboard, providing a header with a Create Order action and embedded controls for automatic and quick order creation alongside the order listing.
 *
 * @returns The React element for the Orders page, containing the header and actions, an auto-generate toggle, a quick order generator, and the order listing.
 */
export default function OrdersPage() {
  const navigate = useNavigate()

  const handleCreateOrder = () => {
    navigate('/dashboard/orders/new')
  }

  return (
    <div className="container p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-4">
          <Button onClick={handleCreateOrder} className="flex items-center gap-2">
            <Icons.add className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-4">
        <AutoGenerateToggle />
        <QuickOrderGenerator />
      </div>
      <OrderListingPage />
    </div>
  )
}
