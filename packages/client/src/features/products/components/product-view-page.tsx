import { useProduct } from "@/hooks/use-products";
import { Navigate, useParams } from "react-router-dom";
import ProductForm from "./product-form";

export default function ProductViewPage() {
  const { productId } = useParams<{ productId: string }>();

  const { data: product, isLoading } = useProduct(productId);

  const pageTitle = productId === "new" ? "Create New Product" : "Edit Product";

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // return <Navigate to="/not-found" replace />;
  return <ProductForm initialData={product || null} pageTitle={pageTitle} />;
}
