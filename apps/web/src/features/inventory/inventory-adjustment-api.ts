import { apiFetch } from "@/lib/api/client";

import type { Product } from "@/features/products/products-api";

export type InventoryAdjustmentStatus =
  | "DRAFT"
  | "COUNTED"
  | "FOR_APPROVAL"
  | "CONFIRMED"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED";

export type AdjustmentBranch = {
  id: string;
  code?: string | null;
  name: string;
};

export type AdjustmentUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export type InventoryAdjustmentItem = {
  id: string;
  adjustmentId: string;
  productId: string;

  systemQuantity: number;
  countedQuantity: number;
  difference: number;

  unitCost: string | number;
  totalCost: string | number;

  reason?: string | null;
  notes?: string | null;

  product: Product;
};

export type InventoryAdjustment = {
  id: string;
  adjustmentNo: string;

  branchId: string;
  status: InventoryAdjustmentStatus;

  adjustmentDate: string;

  notes?: string | null;

  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;

  rejectedAt?: string | null;
  rejectionReason?: string | null;

  branch: AdjustmentBranch;

  createdBy?: AdjustmentUser | null;
  approvedBy?: AdjustmentUser | null;

  items: InventoryAdjustmentItem[];

  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustmentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "adjustmentNo" | "status" | "adjustmentDate" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type InventoryAdjustmentListResponse = {
  items: InventoryAdjustment[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CreateInventoryAdjustmentPayload = {
  branchId: string;
  notes?: string;
};

export type InventoryAdjustmentCountItemPayload = {
  productId: string;
  countedQuantity: number;
  reason?: string;
  notes?: string;
};

export type CountInventoryAdjustmentPayload = {
  items: InventoryAdjustmentCountItemPayload[];
};

export type RejectInventoryAdjustmentPayload = {
  rejectionReason: string;
};

function buildQuery(query: InventoryAdjustmentQuery) {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return params.toString();
}

export async function getInventoryAdjustments(
  query: InventoryAdjustmentQuery = {},
): Promise<InventoryAdjustmentListResponse> {
  const queryString = buildQuery(query);

  return apiFetch<InventoryAdjustmentListResponse>(
    `/inventory-adjustments?${queryString}`,
  );
}

export async function getInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}`);
}

export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentPayload,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>("/inventory-adjustments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function countInventoryAdjustment(
  id: string,
  payload: CountInventoryAdjustmentPayload,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/count`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function confirmInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/confirm`, {
    method: "POST",
  });
}

export async function submitInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/submit`, {
    method: "POST",
  });
}

export async function approveInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectInventoryAdjustment(
  id: string,
  payload: RejectInventoryAdjustmentPayload,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function postInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/post`, {
    method: "POST",
  });
}

export async function cancelInventoryAdjustment(
  id: string,
): Promise<InventoryAdjustment> {
  return apiFetch<InventoryAdjustment>(`/inventory-adjustments/${id}/cancel`, {
    method: "POST",
  });
}
