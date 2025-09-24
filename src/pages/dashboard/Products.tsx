import ProductListingPage from "@/features/products/components/product-listing";

export default function ProductsPage() {
  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold">Products</h1>
      <ProductListingPage />
    </div>
  );
}
