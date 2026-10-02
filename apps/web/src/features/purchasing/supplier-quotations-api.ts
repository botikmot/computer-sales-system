import { apiFetch } from "@/lib/api/client";

export type SupplierQuotationStatus =
  "DRAFT" | "RECEIVED" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type SupplierQuotationBranch = {
  id: string;
  code: string;
  name: string;
};

export type SupplierQuotationSupplier = {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive: boolean;
};

export type SupplierQuotationPurchaseRequest = {
  id: string;
  requestNo: string;
  branchId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierQuotationProduct = {
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
};

export type SupplierQuotationItem = {
  id: string;
  supplierQuotationId: string;
  productId: string;
  quantity: number;
  unitCost: string | number;
  subtotal: string | number;
  product: SupplierQuotationProduct;
};

export type SupplierQuotation = {
  id: string;
  quotationNo: string;
  branchId: string;
  supplierId: string;
  purchaseRequestId?: string | null;

  status: SupplierQuotationStatus;

  quotationDate: string;
  validUntil?: string | null;
  notes?: string | null;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: SupplierQuotationBranch;
  supplier: SupplierQuotationSupplier;
  purchaseRequest?: SupplierQuotationPurchaseRequest | null;
  items: SupplierQuotationItem[];
};

export type SupplierQuotationRecord = {
  id: string;
  quotationNo: string;
  branchId: string;
  supplierId: string;
  purchaseRequestId?: string | null;

  status: SupplierQuotationStatus;

  quotationDate: string;
  validUntil?: string | null;
  notes?: string | null;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierQuotationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  purchaseRequestId?: string;
  status?: SupplierQuotationStatus;

  sortBy?:
    | "quotationNo"
    | "quotationDate"
    | "validUntil"
    | "status"
    | "total"
    | "createdAt";

  sortOrder?: "asc" | "desc";
};

export type SupplierQuotationListResponse = {
  data: SupplierQuotation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type SupplierQuotationItemPayload = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type CreateSupplierQuotationPayload = {
  branchId: string;
  supplierId: string;
  purchaseRequestId: string;
  quotationDate?: string;
  validUntil?: string;
  notes?: string;
  items: SupplierQuotationItemPayload[];
};

export async function getSupplierQuotations(
  query: SupplierQuotationQuery = {},
): Promise<SupplierQuotationListResponse> {
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

  if (query.purchaseRequestId) {
    params.set("purchaseRequestId", query.purchaseRequestId);
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

  return apiFetch<SupplierQuotationListResponse>(
    `/supplier-quotations${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getSupplierQuotation(
  id: string,
): Promise<SupplierQuotation> {
  return apiFetch<SupplierQuotation>(`/supplier-quotations/${id}`);
}

export async function createSupplierQuotation(
  payload: CreateSupplierQuotationPayload,
): Promise<SupplierQuotation> {
  return apiFetch<SupplierQuotation>("/supplier-quotations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function receiveSupplierQuotation(
  id: string,
): Promise<SupplierQuotationRecord> {
  return apiFetch<SupplierQuotationRecord>(
    `/supplier-quotations/${id}/receive`,
    {
      method: "POST",
    },
  );
}

export async function acceptSupplierQuotation(
  id: string,
): Promise<SupplierQuotationRecord> {
  return apiFetch<SupplierQuotationRecord>(
    `/supplier-quotations/${id}/accept`,
    {
      method: "POST",
    },
  );
}

export async function rejectSupplierQuotation(
  id: string,
): Promise<SupplierQuotationRecord> {
  return apiFetch<SupplierQuotationRecord>(
    `/supplier-quotations/${id}/reject`,
    {
      method: "POST",
    },
  );
}

export async function cancelSupplierQuotation(
  id: string,
): Promise<SupplierQuotationRecord> {
  return apiFetch<SupplierQuotationRecord>(
    `/supplier-quotations/${id}/cancel`,
    {
      method: "POST",
    },
  );
}
