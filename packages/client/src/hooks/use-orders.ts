import { useQuery } from "@tanstack/react-query";
import { Order } from "@dashboard/shared-types";
import { api } from "@/lib/api";

interface ListApiResponse {
  success: boolean;
  records: Order[];
  totalSize: number;
  message?: string;
}

interface ApiResponse {
  success: boolean;
  record: Order;
  totalSize: number;
  message?: string;
}

const fetchOrders = async (): Promise<Order[]> => {
  const data: ListApiResponse = await api.get("/salesforce/Order/query");

  if (data.success && data.records) {
    return data.records;
  } else {
    throw new Error(data.message || "Failed to fetch orders from API");
  }
};

const fetchOrder = async (orderId: string): Promise<Order> => {
  const data: ApiResponse = await api.get(`/salesforce/records/Order/${orderId}`);

  if (data.success && data.record) {
    return data.record;
  } else {
    throw new Error(data.message || "Failed to fetch order from API");
  }
};

export const useOrders = () => {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useOrder = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ["order", orderId],
    enabled: !!orderId,
    queryFn: () => fetchOrder(orderId as string),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
