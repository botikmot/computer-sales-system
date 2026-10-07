import { apiFetch } from "@/lib/api/client";

import type { Receiving } from "./receivings-api";

export type PurchaseInvoice = {
  id: string;
  invoiceNo: string;
  supplierInvoiceNo?: string | null;

  branchId: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  receivingId?: string | null;

  status: string;
  paymentMode: string;

  invoiceDate: string;
  dueDate?: string | null;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  amountPaid: string | number;
  balanceDue: string | number;

  notes?: string | null;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  supplier: {
    id: string;
    code: string;
    name: string;
  };

  purchaseOrder?: {
    id: string;
    poNumber: string;
  } | null;

  receiving?: {
    id: string;
    receivingNo: string;
  } | null;

  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitCost: string | number;
    subtotal: string | number;

    product: {
      id: string;
      sku: string;
      name: string;
      unit: string;
    };
  }>;
};

export type PurchaseInvoiceListResponse = {
  items: PurchaseInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ReceivingAwaitingInvoiceResponse = {
  items: Receiving[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getPurchaseInvoices(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    branchId?: string;
  } = {},
): Promise<PurchaseInvoiceListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
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

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  return apiFetch<PurchaseInvoiceListResponse>(
    `/purchase-invoices?${params.toString()}`,
  );
}

export async function getReceivingsAwaitingSupplierInvoice(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
  } = {},
): Promise<ReceivingAwaitingInvoiceResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 5));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.branchId) {
    params.set("branchId", query.branchId);
  }

  return apiFetch<ReceivingAwaitingInvoiceResponse>(
    `/purchase-invoices/awaiting-receivings?${params.toString()}`,
  );
}

export async function getPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  return apiFetch<PurchaseInvoice>(`/purchase-invoices/${id}`);
}

export type CreatePurchaseInvoicePayload = {
  receivingId: string;
  supplierInvoiceNo?: string;
  paymentMode: "COD" | "TERMS" | "CASH";
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  items: Array<{
    receivingItemId: string;
  }>;
};

export async function createPurchaseInvoice(
  payload: CreatePurchaseInvoicePayload,
): Promise<PurchaseInvoice> {
  return apiFetch<PurchaseInvoice>("/purchase-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
