import { useQuery } from "@tanstack/react-query";
import { Product } from "@dashboard/shared-types";
import { api } from "@/lib/api";

interface ListApiResponse {
  success: boolean;
  records: Product[];
  totalSize: number;
  message?: string;
}

interface ApiResponse {
  success: boolean;
  record: Product;
  totalSize: number;
  message?: string;
}

const fetchProducts = async (): Promise<Product[]> => {
  const data: ListApiResponse = await api.get("/salesforce/Product2/query");

  if (data.success && data.records) {
    return data.records;
  } else {
    throw new Error(data.message || "Failed to fetch products from API");
  }
};

const fetchProduct = async (productId: string): Promise<Product> => {
  const data: ApiResponse = await api.get(`/salesforce/records/Product2/${productId}`);

  if (data.success && data.record) {
    return data.record;
  } else {
    throw new Error(data.message || "Failed to fetch product from API");
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

export const useProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product", productId],
    enabled: !!productId,
    queryFn: () => fetchProduct(productId as string),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
