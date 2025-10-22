import { parseAsInteger, useQueryState } from 'nuqs'
import { useOrdersPaginated } from '@/hooks/use-orders'
import { OrderTable } from './order-tables'
import { columns } from './order-tables/columns'

type OrderListingPage = {}

/**
 * Renders a paginated order listing driven by URL query parameters `page` and `perPage`.
 *
 * Displays a centered loading message while fetching, a centered error block if the fetch fails,
 * and otherwise renders an OrderTable populated with the fetched records and pagination data.
 *
 * @returns A React element that renders the paginated orders table or the appropriate loading/error UI.
 */
export default function OrderListingPage({}: OrderListingPage) {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(10))

  const { data, isLoading, error, isError } = useOrdersPaginated({
    page,
    limit: perPage,
  })

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading orders...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">
          <div className="text-lg font-semibold mb-2">Error loading orders</div>
          <div className="text-sm">{error?.message || 'An unknown error occurred'}</div>
        </div>
      </div>
    )
  }

  return <OrderTable data={data?.records || []} columns={columns} pagination={data?.pagination} />
}
