import { Navigate, useParams } from 'react-router-dom'
import { useProduct } from '@/hooks/use-products'
import ProductForm from './product-form'

/**
 * Page component that presents a form for creating or editing a product based on the route parameter.
 *
 * Reads the `productId` route parameter, fetches the corresponding product data, shows a loading indicator while fetching, and renders `ProductForm` initialized for creation (`productId === "new"`) or editing.
 *
 * @returns The page content: a loading indicator while the product is being fetched, otherwise the `ProductForm` initialized with the fetched product (or `null`) and an appropriate page title.
 */
export default function ProductViewPage() {
  const { productId } = useParams<{ productId: string }>()

  const { data: product, isLoading } = useProduct(productId)

  const pageTitle = productId === 'new' ? 'Create New Product' : 'Edit Product'

  if (isLoading) {
    return <div>Loading...</div>
  }

  // return <Navigate to="/not-found" replace />;
  return <ProductForm initialData={product || null} pageTitle={pageTitle} />
}
