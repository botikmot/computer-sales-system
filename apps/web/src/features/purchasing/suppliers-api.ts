import { apiFetch } from "@/lib/api/client";

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?:
    "code" | "name" | "contactPerson" | "contactNumber" | "email" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type SupplierListResponse = {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateSupplierPayload = {
  code: string;
  name: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive?: boolean;
};

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export async function getSuppliers(
  query: SupplierQuery = {},
): Promise<SupplierListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
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

  return apiFetch<SupplierListResponse>(`/suppliers?${params.toString()}`);
}

export async function getSupplier(id: string): Promise<Supplier> {
  return apiFetch<Supplier>(`/suppliers/${id}`);
}

export async function createSupplier(
  payload: CreateSupplierPayload,
): Promise<Supplier> {
  return apiFetch<Supplier>("/suppliers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateSupplier(
  id: string,
  payload: UpdateSupplierPayload,
): Promise<Supplier> {
  return apiFetch<Supplier>(`/suppliers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
