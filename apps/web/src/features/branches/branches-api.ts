import { apiFetch } from "@/lib/api/client";

export type Branch = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getBranches(): Promise<Branch[]> {
  return apiFetch<Branch[]>("/branches");
}

export async function getBranch(id: string): Promise<Branch> {
  return apiFetch<Branch>(`/branches/${id}`);
}
