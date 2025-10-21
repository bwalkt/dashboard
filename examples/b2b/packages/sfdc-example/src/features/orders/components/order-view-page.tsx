import { useParams } from "react-router-dom";
import { useOrder } from "@/hooks/use-orders";
import OrderForm from "./order-form";

export default function OrderViewPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useOrder(orderId);

  const pageTitle = orderId === "new" ? "Create New Order" : "Edit Order";

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // return <Navigate to="/not-found" replace />;
  return <OrderForm initialData={order || null} pageTitle={pageTitle} />;
}
