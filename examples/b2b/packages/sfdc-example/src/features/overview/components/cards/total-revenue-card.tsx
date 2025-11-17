import { useMemo } from 'react'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrdersLast30Days } from '@/hooks/use-orders'
import { formatCurrency } from '@/lib/format'

export default function TotalRevenueCard() {
  const { data: orders, isLoading, error } = useOrdersLast30Days()

  const revenueData = useMemo(() => {
    if (!orders) return { total: 0 }

    const total = orders.reduce((sum, order) => sum + (order.Total_Amount__c || 0), 0)

    return { total }
  }, [orders])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Revenue (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Revenue (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Error</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Failed to load revenue data</div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Total Revenue (Last 30 Days)</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">
          {formatCurrency(revenueData.total)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">Revenue from all orders</div>
      </CardFooter>
    </Card>
  )
}
