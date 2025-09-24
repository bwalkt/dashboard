import { ProductTable } from "./product-tables";
import { columns } from "./product-tables/columns";
import { useProducts } from "@/hooks/use-products";

type ProductListingPage = {};

export default function ProductListingPage({}: ProductListingPage) {
  const { data: products = [], isLoading, error, isError } = useProducts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">
          <div className="text-lg font-semibold mb-2">Error loading products</div>
          <div className="text-sm">{error?.message || "An unknown error occurred"}</div>
        </div>
      </div>
    );
  }

  return <ProductTable data={products} totalItems={products.length} columns={columns} />;
}
