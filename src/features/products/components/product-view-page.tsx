import { fakeProducts, Product } from '@/constants/mock-api';
import { useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ProductForm from './product-form';

export default function ProductViewPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const pageTitle = productId === 'new' ? 'Create New Product' : 'Edit Product';

  useEffect(() => {
    async function loadProduct() {
      if (productId && productId !== 'new') {
        try {
          const data = await fakeProducts.getProductById(Number(productId));
          const productData = data.product as Product;
          if (!productData) {
            setNotFound(true);
          } else {
            setProduct(productData);
          }
        } catch (error) {
          setNotFound(true);
        }
      }
      setLoading(false);
    }

    loadProduct();
  }, [productId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (notFound) {
    return <Navigate to='/not-found' replace />;
  }

  return <ProductForm initialData={product} pageTitle={pageTitle} />;
}
