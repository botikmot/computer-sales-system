import { apiFetch } from "@/lib/api/client";

import type { PurchaseOrderListResponse } from "./purchase-orders-api";

export type ReceivingProduct = {
  id: string;
  sku: string;
  name: string;
  unit?: string | null;
};

export type ReceivingPurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: string | number;
  subtotal: string | number;
  receivedQuantity: number;

  product: ReceivingProduct;
};

export type ReceivingItem = {
  id: string;
  receivingId: string;
  purchaseOrderItemId: string;
  productId: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  qualityStatus: string;
  qualityNotes?: string | null;
  notes?: string | null;
  product: ReceivingProduct;
  purchaseOrderItem: ReceivingPurchaseOrderItem;
};

export type ReceivingSupplier = {
  id: string;
  name: string;
};

export type ReceivingPurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDate?: string | null;
  total: string | number;
  supplier: ReceivingSupplier;
};

export type ReceivingBranch = {
  id: string;
  code: string;
  name: string;
};

export type Receiving = {
  id: string;
  receivingNo: string;
  branchId: string;
  purchaseOrderId: string;
  status: string;
  checkStatus: string;
  receivedDate: string;
  referenceNo?: string | null;
  notes?: string | null;
  checkedAt?: string | null;
  checkNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: ReceivingBranch;
  purchaseOrder: ReceivingPurchaseOrder;
  items: ReceivingItem[];
};

export type ReceivingListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?:
    "receivingNo" | "receivedDate" | "status" | "checkStatus" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type ReceivingListResponse = {
  items: Receiving[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CreateReceivingItemPayload = {
  purchaseOrderItemId: string;
  quantityReceived: number;
  notes?: string;
};

export type CreateReceivingPayload = {
  purchaseOrderId: string;
  referenceNo?: string;
  notes?: string;
  items: CreateReceivingItemPayload[];
};

export type VerifyReceivingItemPayload = {
  receivingItemId: string;
  quantityAccepted: number;
  quantityRejected: number;
  qualityNotes?: string;
};

export type VerifyReceivingPayload = {
  items: VerifyReceivingItemPayload[];
  checkNotes?: string;
};

export type PurchaseOrderForReceiving = ReceivingPurchaseOrder & {
  branchId: string;
  items: ReceivingPurchaseOrderItem[];
};

export async function getReceivings(
  query: ReceivingListQuery = {},
): Promise<ReceivingListResponse> {
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

  return apiFetch<ReceivingListResponse>(`/receivings?${params.toString()}`);
}

export async function getReceiving(id: string): Promise<Receiving> {
  return apiFetch<Receiving>(`/receivings/${id}`);
}

export async function createReceiving(
  payload: CreateReceivingPayload,
): Promise<Receiving> {
  return apiFetch<Receiving>("/receivings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyReceiving(
  id: string,
  payload: VerifyReceivingPayload,
): Promise<Receiving> {
  return apiFetch<Receiving>(`/receivings/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postReceiving(id: string): Promise<Receiving> {
  return apiFetch<Receiving>(`/receivings/${id}/post`, {
    method: "POST",
  });
}

export async function getPurchaseOrdersForReceiving(): Promise<
  PurchaseOrderForReceiving[]
> {
  const [sentResponse, partiallyReceivedResponse] = await Promise.all([
    apiFetch<{
      data: PurchaseOrderForReceiving[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/purchase-orders?status=SENT&limit=100&page=1"),

    apiFetch<{
      data: PurchaseOrderForReceiving[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/purchase-orders?status=PARTIALLY_RECEIVED&limit=100&page=1"),
  ]);

  return [...sentResponse.data, ...partiallyReceivedResponse.data];
}

export async function getPurchaseOrder(
  id: string,
): Promise<PurchaseOrderForReceiving> {
  return apiFetch<PurchaseOrderForReceiving>(`/purchase-orders/${id}`);
}

export async function getPurchaseOrdersAwaitingReceiving(
  query: {
    page?: number;
    limit?: number;
    search?: string;
  } = {},
): Promise<PurchaseOrderListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 5));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  const queryString = params.toString();

  return apiFetch<PurchaseOrderListResponse>(
    `/receivings/awaiting-purchase-orders${
      queryString ? `?${queryString}` : ""
    }`,
  );
}
