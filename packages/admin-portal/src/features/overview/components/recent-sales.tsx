import { faker } from '@faker-js/faker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersLast30Days } from '@/hooks/use-orders'
import { formatCurrency } from '@/lib/format'

/**
 * Render a "Recent Orders" card that displays up to five most recent orders with a positive total, including loading and error states.
 *
 * The component fetches orders for the last 30 days, derives the most recent five with Total_Amount__c or TotalAmount > 0, and renders:
 * - a skeleton list while loading,
 * - an error message on fetch failure,
 * - or a list of order items with avatar, customer name, truncated email, and formatted amount.
 *
 * @returns A JSX element containing the Recent Orders card with its loading, error, or populated list UI.
 */
export function RecentSales() {
  const { data: orders, isLoading, error } = useOrdersLast30Days()

  // Get the latest 5 orders with total amount > 0, sorted by creation date
  const recentOrders =
    orders
      ?.filter(order => {
        const amount = order.Total_Amount__c || 0
        return amount > 0
      })
      ?.sort((a, b) => new Date(b.EffectiveDate).getTime() - new Date(a.EffectiveDate).getTime())
      ?.slice(0, 5) || []
  // Generate initials from customer name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'UN'
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  // Generate avatar URL using Faker.js based on customer name
  const getAvatarUrl = (name: string | null | undefined, index: number) => {
    if (!name) {
      // Use Faker to generate a random avatar for unknown customers
      faker.seed(index)
      return faker.image.avatar()
    }

    // Use customer name as seed for consistent avatar generation
    faker.seed(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
    return faker.image.avatar()
  }

  // Truncate email if it's longer than 15 characters
  const truncateEmail = (email: string | null | undefined) => {
    if (!email) return 'No email provided'
    return email.length > 15 ? `${email.substring(0, 15)}...` : email
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Loading recent sales...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="ml-4 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Unable to load recent sales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Failed to load recent sales data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>
          You made{' '}
          {orders?.filter(order => {
            const amount = order.TotalAmount || order.Total_Amount__c || 0
            return amount > 0
          }).length || 0}{' '}
          orders this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {recentOrders.length > 0 ? (
            recentOrders.map((order, index) => {
              const customerName = order.Customer_Name__c || 'Unknown Customer'
              const customerEmail = order.Customer_Email__c || 'No email provided'
              const amount = order.TotalAmount || order.Total_Amount__c || 0

              return (
                <div key={order.Id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getAvatarUrl(customerName, index)} alt="Avatar" />
                    <AvatarFallback>{getInitials(customerName)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm leading-none font-medium">{customerName}</p>
                    <p className="text-muted-foreground text-sm">{truncateEmail(customerEmail)}</p>
                  </div>
                  <div className="ml-auto font-medium">+{formatCurrency(amount)}</div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">No recent sales found</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
