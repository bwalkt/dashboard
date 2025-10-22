import { useParams } from 'react-router-dom'
import { useOrder } from '@/hooks/use-orders'
import OrderForm from './order-form'

/**
 * Page component that displays an order form for creating a new order or editing an existing one.
 *
 * The component reads the `orderId` from the URL, derives a page title ("Create New Order" when
 * `orderId` equals `"new"`, otherwise "Edit Order"), shows a loading indicator while order data
 * is being fetched, and renders `OrderForm` with the fetched order as `initialData` (or `null`)
 * and the computed `pageTitle`.
 *
 * @returns A React element that is either a loading indicator or the `OrderForm` configured for create/edit.
 */
export default function OrderViewPage() {
  const { orderId } = useParams<{ orderId: string }>()

  const { data: order, isLoading } = useOrder(orderId)

  const pageTitle = orderId === 'new' ? 'Create New Order' : 'Edit Order'

  if (isLoading) {
    return <div>Loading...</div>
  }

  // return <Navigate to="/not-found" replace />;
  return <OrderForm initialData={order || null} pageTitle={pageTitle} />
}
