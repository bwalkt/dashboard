import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";

export default function TotalProductsCard() {
  const { data: products, isLoading, error } = useProducts();
  const navigate = useNavigate();

  const productsData = useMemo(() => {
    if (!products) return { total: 0 };

    // products is now a paginated response with totalSize
    const total = products.totalSize;

    return { total };
  }, [products]);

  const handleCardClick = () => {
    navigate("/dashboard/products");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Products</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Total Products</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Error</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Failed to load products data</div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardHeader>
        <CardDescription>Total Products</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">{productsData.total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">Click to view all products</div>
      </CardFooter>
    </Card>
  );
}
