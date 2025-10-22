import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrdersLast30Days } from '@/hooks/use-orders'

/**
 * Renders a dashboard card showing the total number of orders for the last 30 days.
 *
 * The card displays a loading state, an error state, or the formatted total count. Clicking the card navigates to "/dashboard/orders".
 *
 * @returns A Card element that shows loading, error, or the total orders and supports click navigation to the orders list.
 */
export default function TotalOrdersCard() {
  const { data: orders, isLoading, error } = useOrdersLast30Days()
  const navigate = useNavigate()

  const ordersData = useMemo(() => {
    if (!orders) return { total: 0 }

    const total = orders.length

    return { total }
  }, [orders])

  const handleCardClick = () => {
    navigate('/dashboard/orders')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Orders (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Orders (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Error</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Failed to load orders data</div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardHeader>
        <CardDescription>Total Orders (Last 30 Days)</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">
          {ordersData.total.toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">Click to view all orders</div>
      </CardFooter>
    </Card>
  )
}
