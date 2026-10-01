import { apiFetch } from "@/lib/api/client";

export type InventoryStockItem = {
  branchId: string;
  branchCode: string;
  branchName: string;

  productId: string;

  sku: string;
  productName: string;
  category: string | null;
  unit: string;

  quantity: number;
  averageCost: string | number;
  inventoryValue: string | number;

  updatedAt: string;
};

export type InventoryStockQuery = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  productId?: string;
  sortBy?: "productName" | "sku" | "quantity" | "averageCost" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export type InventoryStockResponse = {
  count: number;
  totalQuantity: number;
  totalValue: string | number;

  items: InventoryStockItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getInventoryStock(
  query: InventoryStockQuery = {},
): Promise<InventoryStockResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  if (query.productId) {
    params.set("productId", query.productId);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<InventoryStockResponse>(
    `/reports/inventory/stock${queryString ? `?${queryString}` : ""}`,
  );
}
