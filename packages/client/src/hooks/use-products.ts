import { useQuery } from "@tanstack/react-query";
import { SalesforceProduct as Product } from "@dashboard/shared-types";

interface ApiResponse {
  success: boolean;
  records: Product[];
  totalSize: number;
  message?: string;
}

const fetchProducts = async (): Promise<Product[]> => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  if (!backendUrl) {
    throw new Error("Backend URL not configured. Please set VITE_BACKEND_URL in your environment variables.");
  }

  const response = await fetch(`${backendUrl}/salesforce/Product2/query`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }

  const data: ApiResponse = await response.json();

  if (data.success && data.records) {
    return data.records;
  } else {
    throw new Error(data.message || "Failed to fetch products from API");
  }
};

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
