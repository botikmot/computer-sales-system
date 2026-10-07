import { apiFetch } from "@/lib/api/client";

export type AccountsPayableStatus =
  "OPEN" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export type AccountsPayableSortField =
  | "dueDate"
  | "originalAmount"
  | "amountPaid"
  | "balanceDue"
  | "status"
  | "paymentMode"
  | "createdAt"
  | "updatedAt";

export type AccountsPayableQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountsPayableStatus;
  sortBy?: AccountsPayableSortField;
  sortOrder?: "asc" | "desc";
};

export type AccountsPayableBranch = {
  id: string;
  code: string;
  name: string;
};

export type AccountsPayableSupplier = {
  id: string;
  code: string;
  name: string;
};

export type AccountsPayablePurchaseInvoice = {
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
};

export type AccountsPayable = {
  id: string;

  branchId: string;
  supplierId: string;
  purchaseInvoiceId: string;

  paymentMode: string;
  status: AccountsPayableStatus;

  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;

  dueDate?: string | null;
  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: AccountsPayableBranch;
  supplier: AccountsPayableSupplier;
  purchaseInvoice: AccountsPayablePurchaseInvoice;
};

export type AccountsPayableListResponse = {
  items: AccountsPayable[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AwaitingAccountsPayableInvoice = {
  id: string;
  invoiceNo: string;
  supplierInvoiceNo?: string | null;

  invoiceDate: string;
  dueDate?: string | null;

  paymentMode: string;

  total: string;
  amountPaid: string;
  balanceDue: string;

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
};

export async function getAccountsPayable(
  query: AccountsPayableQuery = {},
): Promise<AccountsPayableListResponse> {
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

  return apiFetch<AccountsPayableListResponse>(
    `/accounts-payable?${params.toString()}`,
  );
}

export type CreateAccountsPayablePayload = {
  purchaseInvoiceId: string;
  notes?: string;
};

export async function createAccountsPayable(
  payload: CreateAccountsPayablePayload,
): Promise<AccountsPayable> {
  return apiFetch<AccountsPayable>("/accounts-payable", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAccountPayable(id: string): Promise<AccountsPayable> {
  return apiFetch<AccountsPayable>(`/accounts-payable/${id}`);
}

export async function getAccountsPayableAwaitingInvoices(): Promise<
  AwaitingAccountsPayableInvoice[]
> {
  return apiFetch<AwaitingAccountsPayableInvoice[]>(
    "/accounts-payable/awaiting-invoices",
  );
}
