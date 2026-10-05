import { apiFetch } from "@/lib/api/client";

export type Customer = {
  id: string;
  code: string;
  name: string;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "name" | "contactNumber" | "email" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type CustomerListResponse = {
  items: Customer[];
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
  };
};

export type CreateCustomerPayload = {
  name: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive?: boolean;
};

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export async function getCustomers(): Promise<Customer[]> {
  const result = await getCustomersPage({
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });

  return result.items;
}

export async function getCustomersPage(
  query: CustomerQuery = {},
): Promise<CustomerListResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.search) {
    params.set("search", query.search);
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

  return apiFetch<CustomerListResponse>(
    `/customers${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`);
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  return apiFetch<Customer>("/customers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
