import { apiFetch } from "@/lib/api/client";

export type AccountRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "PURCHASING"
  | "INVENTORY"
  | "TECHNICIAN"
  | "CASHIER";

export type AccountStatus = "ACTIVE" | "INACTIVE";

export type AccountUser = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: AccountRole;
  status: AccountStatus;
  branchId: string | null;
  branch: { id: string; name: string; code?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateMyProfilePayload = {
  fullName: string;
  email: string | null;
};

export type ChangeMyPasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export async function getMyAccount(): Promise<AccountUser> {
  return apiFetch<AccountUser>("/auth/me");
}

export async function updateMyProfile(
  payload: UpdateMyProfilePayload,
): Promise<AccountUser> {
  return apiFetch<AccountUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changeMyPassword(
  payload: ChangeMyPasswordPayload,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
