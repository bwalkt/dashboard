import OrderListingPage from "@/features/orders/components/order-listing";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useNavigate } from "react-router-dom";
import { QuickOrderGenerator } from "@/components/order-generator";
import { AutoGenerateToggle } from "@/components/auto-order-generator";

export default function OrdersPage() {
  const navigate = useNavigate();

  const handleCreateOrder = () => {
    navigate("/dashboard/orders/new");
  };

  return (
    <div className="container p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-4">
          <Button onClick={handleCreateOrder} className="flex items-center gap-2">
            <Icons.add className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-4">
        <AutoGenerateToggle />
        <QuickOrderGenerator />
      </div>
      <OrderListingPage />
    </div>
  );
}
