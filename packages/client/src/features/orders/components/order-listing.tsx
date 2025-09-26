import { OrderTable } from "./order-tables";
import { columns } from "./order-tables/columns";
import { useOrders } from "@/hooks/use-orders";

type OrderListingPage = {};

export default function OrderListingPage({}: OrderListingPage) {
  const { data: orders = [], isLoading, error, isError } = useOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">
          <div className="text-lg font-semibold mb-2">Error loading orders</div>
          <div className="text-sm">{error?.message || "An unknown error occurred"}</div>
        </div>
      </div>
    );
  }

  return <OrderTable data={orders} totalItems={orders.length} columns={columns} />;
}
