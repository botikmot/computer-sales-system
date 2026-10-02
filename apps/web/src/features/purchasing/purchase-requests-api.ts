import { apiFetch } from "@/lib/api/client";

export type PurchaseRequestStatus =
  "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export type PurchaseRequestBranch = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseRequestProduct = {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  unit: string;
  isActive: boolean;
};

export type PurchaseRequestItem = {
  id: string;
  purchaseRequestId: string;
  productId: string;
  quantity: number;
  notes?: string | null;
  product: PurchaseRequestProduct;
};

export type PurchaseRequest = {
  id: string;
  requestNo: string;
  branchId: string;
  status: PurchaseRequestStatus;
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: PurchaseRequestBranch;

  items: PurchaseRequestItem[];
};

export type PurchaseRequestRecord = {
  id: string;
  requestNo: string;
  branchId: string;
  status: PurchaseRequestStatus;
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestQuery = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: PurchaseRequestStatus;
  sortBy?: "requestNo" | "purpose" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type PurchaseRequestListResponse = {
  data: PurchaseRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PurchaseRequestItemPayload = {
  productId: string;
  quantity: number;
  notes?: string;
};

export type CreatePurchaseRequestPayload = {
  branchId: string;
  purpose?: string;
  notes?: string;
  items: PurchaseRequestItemPayload[];
};

export type UpdatePurchaseRequestPayload = {
  branchId?: string;
  purpose?: string;
  notes?: string;
  items?: PurchaseRequestItemPayload[];
};

export async function getPurchaseRequests(
  query: PurchaseRequestQuery = {},
): Promise<PurchaseRequestListResponse> {
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

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<PurchaseRequestListResponse>(
    `/purchase-requests${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getPurchaseRequest(id: string): Promise<PurchaseRequest> {
  return apiFetch<PurchaseRequest>(`/purchase-requests/${id}`);
}

export async function createPurchaseRequest(
  payload: CreatePurchaseRequestPayload,
): Promise<PurchaseRequest> {
  return apiFetch<PurchaseRequest>("/purchase-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseRequest(
  id: string,
  payload: UpdatePurchaseRequestPayload,
): Promise<PurchaseRequest> {
  return apiFetch<PurchaseRequest>(`/purchase-requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function submitPurchaseRequest(
  id: string,
): Promise<PurchaseRequestRecord> {
  return apiFetch<PurchaseRequestRecord>(`/purchase-requests/${id}/submit`, {
    method: "POST",
  });
}

export async function approvePurchaseRequest(
  id: string,
): Promise<PurchaseRequestRecord> {
  return apiFetch<PurchaseRequestRecord>(`/purchase-requests/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectPurchaseRequest(
  id: string,
): Promise<PurchaseRequestRecord> {
  return apiFetch<PurchaseRequestRecord>(`/purchase-requests/${id}/reject`, {
    method: "POST",
  });
}

export async function cancelPurchaseRequest(
  id: string,
): Promise<PurchaseRequestRecord> {
  return apiFetch<PurchaseRequestRecord>(`/purchase-requests/${id}/cancel`, {
    method: "POST",
  });
}
