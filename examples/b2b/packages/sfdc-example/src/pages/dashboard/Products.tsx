import { useNavigate } from 'react-router-dom'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import ProductListingPage from '@/features/products/components/product-listing'

export default function ProductsPage() {
  const navigate = useNavigate()

  const handleCreateProduct = () => {
    navigate('/dashboard/products/new')
  }

  return (
    <div className="container p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={handleCreateProduct} className="flex items-center gap-2">
          <Icons.add className="h-4 w-4" />
          Create Product
        </Button>
      </div>
      <ProductListingPage />
    </div>
  )
}
