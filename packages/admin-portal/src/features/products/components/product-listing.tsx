import { parseAsInteger, useQueryState } from 'nuqs'
import { useProductsPaginated } from '@/hooks/use-products'
import { ProductTable } from './product-tables'
import { columns } from './product-tables/columns'

type ProductListingPage = {}

/**
 * Render the product listing page that reads pagination from the URL, fetches paginated products, and displays loading, error, or table states.
 *
 * @returns The page element that shows a loading indicator while fetching, an error message on fetch failure, or a ProductTable populated with the fetched product records and pagination metadata.
 */
export default function ProductListingPage({}: ProductListingPage) {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(10))

  const { data, isLoading, error, isError } = useProductsPaginated({
    page,
    limit: perPage,
  })

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading products...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">
          <div className="text-lg font-semibold mb-2">Error loading products</div>
          <div className="text-sm">{error?.message || 'An unknown error occurred'}</div>
        </div>
      </div>
    )
  }

  return <ProductTable data={data?.records || []} columns={columns} pagination={data?.pagination} />
}
