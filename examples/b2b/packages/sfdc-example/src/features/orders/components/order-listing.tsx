import { parseAsInteger, useQueryState } from 'nuqs'
import { useOrdersPaginated } from '@/hooks/use-orders'
import { getSortingStateParser } from '@/lib/parsers'
import { Order } from '@/types'
import { OrderTable } from './order-tables'
import { columns } from './order-tables/columns'

type OrderListingPage = {}

export default function OrderListingPage({}: OrderListingPage) {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(10))
  const columnIds = new Set(columns.map(column => column.id).filter(Boolean) as string[])
  const [sorting] = useQueryState(
    'sort',
    getSortingStateParser<Order>(columnIds).withDefault([{ id: 'CreatedDate', desc: true }]),
  )

  const { data, isLoading, error, isError } = useOrdersPaginated({
    page,
    limit: perPage,
    sort: sorting,
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
