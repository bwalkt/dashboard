import { useQuery } from "@tanstack/react-query";
import { Product } from "@dashboard/shared-types";
import { api } from "@/lib/api";

interface ListApiResponse {
  success: boolean;
  records: Product[];
  totalSize: number;
  done: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  message?: string;
}

interface ApiResponse {
  success: boolean;
  record: Product;
  totalSize: number;
  message?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

const fetchProducts = async (params?: PaginationParams): Promise<ListApiResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/salesforce/Product2/query?${queryString}` : "/salesforce/Product2/query";

  const data: ListApiResponse = await api.get(url);

  if (data.success && data.records) {
    return data;
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
    queryFn: () => fetchProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

export const useProductsPaginated = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["products", "paginated", params],
    queryFn: () => fetchProducts(params),
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
