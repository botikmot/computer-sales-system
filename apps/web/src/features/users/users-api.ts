import { apiFetch } from "@/lib/api/client";

export type UserRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "PURCHASING"
  | "INVENTORY"
  | "TECHNICIAN"
  | "CASHIER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserBranch = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type User = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  branchId: string | null;
  branch: UserBranch | null;
  createdAt: string;
  updatedAt: string;
};

export type UserQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
  sortBy?: "username" | "fullName" | "email" | "role" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type UserListResponse = {
  items: User[];
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

export type CreateUserPayload = {
  username: string;
  email?: string;
  fullName: string;
  password: string;
  role: UserRole;
  branchId?: string | null;
};

export type UpdateUserRolePayload = {
  role: UserRole;
};

export type UpdateUserBranchPayload = {
  branchId?: string | null;
};

export type UpdateUserStatusPayload = {
  status: UserStatus;
};

export async function getUsers(
  query: UserQuery = {},
): Promise<UserListResponse> {
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

  if (query.role) {
    params.set("role", query.role);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<UserListResponse>(
    `/users${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getUser(id: string): Promise<User> {
  return apiFetch<User>(`/users/${id}`);
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return apiFetch<User>("/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserRole(
  id: string,
  payload: UpdateUserRolePayload,
): Promise<User> {
  return apiFetch<User>(`/users/${id}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserBranch(
  id: string,
  payload: UpdateUserBranchPayload,
): Promise<User> {
  return apiFetch<User>(`/users/${id}/branch`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(
  id: string,
  payload: UpdateUserStatusPayload,
): Promise<User> {
  return apiFetch<User>(`/users/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
