import { apiFetch } from "@/lib/api/client";

export type AccountsReceivableStatus =
  "OPEN" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export type AccountsReceivableSortField =
  | "dueDate"
  | "originalAmount"
  | "amountPaid"
  | "balanceDue"
  | "status"
  | "createdAt"
  | "updatedAt";

export type AccountsReceivableQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountsReceivableStatus;
  sortBy?: AccountsReceivableSortField;
  sortOrder?: "asc" | "desc";
};

export type AccountsReceivableBranch = {
  id: string;
  code: string;
  name: string;
};

export type AccountsReceivableCustomer = {
  id: string;
  code: string;
  name: string;
};

export type AccountsReceivableSalesInvoice = {
  id: string;
  invoiceNo: string;
  branchId: string;
  customerId: string;
  salesOrderId: string;
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

export type AccountsReceivableServiceInvoice = {
  id: string;
  invoiceNo: string;
  branchId: string;
  customerId: string;
  serviceJobId: string;
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

export type AccountsReceivable = {
  id: string;

  branchId: string;
  customerId: string;

  salesInvoiceId?: string | null;
  serviceInvoiceId?: string | null;

  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;

  status: AccountsReceivableStatus;

  dueDate?: string | null;
  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: AccountsReceivableBranch;
  customer: AccountsReceivableCustomer;

  salesInvoice?: AccountsReceivableSalesInvoice | null;
  serviceInvoice?: AccountsReceivableServiceInvoice | null;
};

export type AccountsReceivableListResponse = {
  items: AccountsReceivable[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getAccountsReceivable(
  query: AccountsReceivableQuery = {},
): Promise<AccountsReceivableListResponse> {
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

  return apiFetch<AccountsReceivableListResponse>(
    `/sales/accounts-receivable?${params.toString()}`,
  );
}

export async function getAccountsReceivableById(
  id: string,
): Promise<AccountsReceivable> {
  return apiFetch<AccountsReceivable>(`/sales/accounts-receivable/${id}`);
}
