import { apiFetch } from "@/lib/api/client";

export type CustomerPaymentStatus = "POSTED";

export type CustomerPaymentBranch = {
  id: string;
  code: string;
  name: string;
};

export type CustomerPaymentCustomer = {
  id: string;
  code: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
};

export type CustomerPaymentInvoice = {
  id: string;
  invoiceNo: string;
  status: string;
  paymentMode: string;
  invoiceDate: string;
  dueDate?: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
};

export type CustomerPaymentAccount = {
  id: string;
  branchId: string;
  accountType: string;
  name: string;
  accountNumber?: string | null;
  openingBalance: string;
  isActive: boolean;
};

export type CustomerPaymentCashBankTransaction = {
  id: string;
  branchId: string;
  customerPaymentId: string;
  accountId: string;
  accountType: string;
  accountName: string;
  transactionType: string;
  direction: "IN" | "OUT";
  amount: string;
  transactionDate: string;
  referenceNo?: string | null;
  notes?: string | null;
};

export type CustomerPayment = {
  id: string;
  paymentNo: string;

  branchId: string;
  customerId: string;

  salesInvoiceId?: string | null;
  serviceInvoiceId?: string | null;

  accountId: string;
  amount: string;
  paymentDate: string;

  referenceNo?: string | null;
  notes?: string | null;

  status: CustomerPaymentStatus;

  createdAt: string;
  updatedAt: string;

  branch: CustomerPaymentBranch;
  customer: CustomerPaymentCustomer;

  salesInvoice?: CustomerPaymentInvoice | null;
  serviceInvoice?: CustomerPaymentInvoice | null;

  account: CustomerPaymentAccount;

  cashBankTransaction?: CustomerPaymentCashBankTransaction | null;
};

export type CustomerPaymentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "paymentNo" | "paymentDate" | "amount" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type CustomerPaymentListResponse = {
  items: CustomerPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CreateCustomerPaymentPayload = {
  salesInvoiceId?: string;
  serviceInvoiceId?: string;

  accountId: string;
  amount: number;

  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
};

export async function getCustomerPayments(
  query: CustomerPaymentQuery = {},
): Promise<CustomerPaymentListResponse> {
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

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<CustomerPaymentListResponse>(
    `/sales/customer-payments${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getCustomerPayment(id: string): Promise<CustomerPayment> {
  return apiFetch<CustomerPayment>(`/sales/customer-payments/${id}`);
}

export async function createCustomerPayment(
  payload: CreateCustomerPaymentPayload,
): Promise<CustomerPayment> {
  return apiFetch<CustomerPayment>("/sales/customer-payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
