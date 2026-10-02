import { apiFetch } from "@/lib/api/client";

export type SupplierPaymentStatus = "POSTED";

export type SupplierPaymentBranch = {
  id: string;
  code: string;
  name: string;
};

export type SupplierPaymentSupplier = {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  contactNumber?: string | null;
  email?: string | null;
};

export type SupplierPaymentAccountsPayable = {
  id: string;
  branchId: string;
  supplierId: string;
  purchaseInvoiceId: string;
  paymentMode: string;
  status: string;
  originalAmount: string;
  amountPaid: string;
  balanceDue: string;
  dueDate?: string | null;
  notes?: string | null;
};

export type SupplierPaymentCashBankTransaction = {
  id: string;
  branchId: string;
  supplierPaymentId: string;
  customerPaymentId?: string | null;
  pettyCashReplenishmentId?: string | null;
  salesReturnId?: string | null;
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

export type SupplierPayment = {
  id: string;
  paymentNo: string;

  branchId: string;
  supplierId: string;
  accountsPayableId: string;
  accountId: string;

  accountType: string;

  amount: string;
  paymentDate: string;

  referenceNo?: string | null;
  notes?: string | null;

  status: SupplierPaymentStatus;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: SupplierPaymentBranch;
  supplier: SupplierPaymentSupplier;
  accountsPayable: SupplierPaymentAccountsPayable;
  cashBankTransaction: SupplierPaymentCashBankTransaction;
};

export type SupplierPaymentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierPaymentStatus;
  sortBy?: "paymentNo" | "paymentDate" | "amount" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type SupplierPaymentListResponse = {
  data: SupplierPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateSupplierPaymentPayload = {
  accountsPayableId: string;
  accountId: string;
  amount: number;
  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
};

export type PaymentVoucher = {
  id: string;
  voucherNo: string;
  branchId: string;
  supplierPaymentId: string;
  voucherDate: string;
  payeeName: string;
  amount: string;
  purpose: string;
  notes?: string | null;
};

export async function getSupplierPayments(
  query: SupplierPaymentQuery = {},
): Promise<SupplierPaymentListResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.search) {
    params.set("search", query.search);
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

  return apiFetch<SupplierPaymentListResponse>(
    `/supplier-payments${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getSupplierPayment(id: string): Promise<SupplierPayment> {
  return apiFetch<SupplierPayment>(`/supplier-payments/${id}`);
}

export async function createSupplierPayment(
  payload: CreateSupplierPaymentPayload,
): Promise<SupplierPayment> {
  return apiFetch<SupplierPayment>("/supplier-payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPaymentVoucherFromSupplierPayment(
  supplierPaymentId: string,
): Promise<PaymentVoucher> {
  return apiFetch<PaymentVoucher>(
    `/payment-vouchers/from-payment/${supplierPaymentId}`,
    {
      method: "POST",
    },
  );
}
