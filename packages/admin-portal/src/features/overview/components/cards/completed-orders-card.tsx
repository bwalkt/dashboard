import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrdersLast30Days } from "@/hooks/use-orders";

export default function CompletedOrdersCard() {
  const { data: orders, isLoading, error } = useOrdersLast30Days();
  const navigate = useNavigate();

  const completedOrdersData = useMemo(() => {
    if (!orders) return { total: 0 };

    const completedOrders = orders.filter((order) => order.Status === "Completed");
    const total = completedOrders.length;

    return { total };
  }, [orders]);

  const handleCardClick = () => {
    navigate("/dashboard/orders");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Completed Orders (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Completed Orders (Last 30 Days)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">Error</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">Failed to load orders data</div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardHeader>
        <CardDescription>Completed Orders (Last 30 Days)</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums lg:text-3xl">{completedOrdersData.total.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">Click to view all orders</div>
      </CardFooter>
    </Card>
  );
}
