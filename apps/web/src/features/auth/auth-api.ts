import { apiFetch } from "@/lib/api/client";

export type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  fullName?: string | null;
  role: string;
  status: string;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
  } | null;
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
};

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      identifier,
      password,
    }),
  });
}
