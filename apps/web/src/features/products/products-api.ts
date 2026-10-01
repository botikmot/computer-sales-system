import { apiFetch } from "@/lib/api/client";

export type ProductCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  unit: string;
  defaultSellingPrice?: string | number | null;
  defaultCostPrice?: string | number | null;
  isActive: boolean;
  trackInventory: boolean;
  categoryId?: string | null;
  category?: ProductCategory | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateProductPayload = {
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  unit?: string;
  defaultSellingPrice?: number;
  defaultCostPrice?: number;
  isActive?: boolean;
  trackInventory?: boolean;
  categoryId?: string;
};

export type ProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?:
    | "sku"
    | "name"
    | "brand"
    | "model"
    | "defaultSellingPrice"
    | "defaultCostPrice"
    | "isActive"
    | "trackInventory"
    | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type ProductListResponse = {
  items: Product[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  summary: {
    total: number;
    active: number;
    inactive: number;
    tracked: number;
  };
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

export async function getProducts(
  query: ProductQuery = {},
): Promise<ProductListResponse> {
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

  if (query.categoryId) {
    params.set("categoryId", query.categoryId);
  }

  if (query.isActive !== undefined) {
    params.set("isActive", String(query.isActive));
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<ProductListResponse>(
    `/products${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  return apiFetch<Product>("/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
