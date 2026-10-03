import { apiFetch } from "@/lib/api/client";

export type Customer = {
  id: string;
  code: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>("/customers");
}

export async function getCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`);
}
