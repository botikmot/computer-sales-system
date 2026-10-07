import { apiFetch } from "@/lib/api/client";

import type { SupplierQuotationListResponse } from "./supplier-quotations-api";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED"
  | "CANCELLED";

export type PurchaseOrderBranch = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseOrderSupplier = {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
};

export type PurchaseOrderPurchaseRequest = {
  id: string;
  requestNo: string;
  branchId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  purpose?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseOrderSupplierQuotation = {
  id: string;
  quotationNo: string;
  branchId: string;
  supplierId: string;
  purchaseRequestId?: string | null;
  status: "DRAFT" | "RECEIVED" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  quotationDate: string;
  validUntil?: string | null;
  notes?: string | null;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseOrderProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  unit: string;
  defaultSellingPrice?: string | number | null;
  defaultCostPrice?: string | number | null;
  isActive: boolean;
  trackInventory: boolean;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: string | number;
  subtotal: string | number;
  receivedQuantity: number;
  product: PurchaseOrderProduct;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;

  branchId: string;
  supplierId: string;

  purchaseRequestId?: string | null;
  supplierQuotationId?: string | null;

  status: PurchaseOrderStatus;

  orderDate: string;
  expectedDate?: string | null;

  notes?: string | null;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: PurchaseOrderBranch;
  supplier: PurchaseOrderSupplier;
  purchaseRequest?: PurchaseOrderPurchaseRequest | null;
  supplierQuotation?: PurchaseOrderSupplierQuotation | null;

  items: PurchaseOrderItem[];
};

export type PurchaseOrderQuery = {
  page?: number;
  limit?: number;

  search?: string;

  branchId?: string;

  status?: PurchaseOrderStatus;

  sortBy?:
    | "poNumber"
    | "orderDate"
    | "expectedDate"
    | "status"
    | "total"
    | "createdAt";

  sortOrder?: "asc" | "desc";
};

export type PurchaseOrderListResponse = {
  data: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreatePurchaseOrderPayload = {
  supplierQuotationId: string;
  expectedDate?: string;
  notes?: string;
};

export async function getPurchaseOrders(
  query: PurchaseOrderQuery = {},
): Promise<PurchaseOrderListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

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

  return apiFetch<PurchaseOrderListResponse>(
    `/purchase-orders?${params.toString()}`,
  );
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/approve`, {
    method: "PATCH",
  });
}

export async function sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/send`, {
    method: "PATCH",
  });
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {
    method: "PATCH",
  });
}

export async function getSupplierQuotationsAwaitingPurchaseOrder(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
  } = {},
): Promise<SupplierQuotationListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 5));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  const queryString = params.toString();

  return apiFetch<SupplierQuotationListResponse>(
    `/purchase-orders/awaiting-supplier-quotations${
      queryString ? `?${queryString}` : ""
    }`,
  );
}
