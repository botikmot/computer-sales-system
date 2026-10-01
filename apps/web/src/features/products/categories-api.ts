import { apiFetch } from "@/lib/api/client";

export type ProductCategory = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
};

export type CategoryQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "isActive" | "createdAt";
  sortOrder?: "asc" | "desc";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
};

export type CategoryListResponse = {
  items: ProductCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getProductCategories(
  query: CategoryQuery = {},
): Promise<CategoryListResponse> {
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

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  const queryString = params.toString();

  return apiFetch<CategoryListResponse>(
    queryString ? `/categories?${queryString}` : "/categories",
  );
}

export async function getProductCategory(id: string): Promise<ProductCategory> {
  return apiFetch<ProductCategory>(`/categories/${id}`);
}

export type CreateCategoryPayload = {
  name: string;
  isActive?: boolean;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export async function createProductCategory(
  payload: CreateCategoryPayload,
): Promise<ProductCategory> {
  return apiFetch<ProductCategory>("/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateProductCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<ProductCategory> {
  return apiFetch<ProductCategory>(`/categories/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
