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

export type CreateBranchPayload = {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export async function createBranch(
  payload: CreateBranchPayload,
): Promise<Branch> {
  return apiFetch<Branch>("/branches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(
  id: string,
  payload: UpdateBranchPayload,
): Promise<Branch> {
  return apiFetch<Branch>(`/branches/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
