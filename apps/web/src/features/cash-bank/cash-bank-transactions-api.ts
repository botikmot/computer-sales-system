import { apiFetch } from "@/lib/api/client";

export type CashBankTransactionDirection = "IN" | "OUT";

export type CashBankTransactionType =
  | "SUPPLIER_PAYMENT"
  | "CUSTOMER_PAYMENT"
  | "PETTY_CASH_REPLENISHMENT"
  | "OTHER_RECEIPT"
  | "EXPENSE"
  | "CUSTOMER_REFUND";

export type CashBankTransactionSortField =
  | "accountName"
  | "transactionType"
  | "direction"
  | "amount"
  | "transactionDate"
  | "createdAt"
  | "updatedAt";

export type CashBankTransactionQuery = {
  page?: number;
  limit?: number;
  search?: string;
  direction?: CashBankTransactionDirection;
  transactionType?: CashBankTransactionType;
  accountId?: string;
  sortBy?: CashBankTransactionSortField;
  sortOrder?: "asc" | "desc";
};

export type CashBankTransactionAccount = {
  id: string;
  branchId: string;
  accountType: string;
  name: string;
  accountNumber?: string | null;
  openingBalance: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashBankTransactionBranch = {
  id: string;
  code: string;
  name: string;
};

export type CashBankTransaction = {
  id: string;

  branchId: string;

  supplierPaymentId?: string | null;
  customerPaymentId?: string | null;
  pettyCashReplenishmentId?: string | null;
  salesReturnId?: string | null;

  accountId: string;
  accountType: string;
  accountName: string;

  transactionType: CashBankTransactionType;
  direction: CashBankTransactionDirection;

  amount: string | number;

  transactionDate: string;

  referenceNo?: string | null;
  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  account: CashBankTransactionAccount;
  branch: CashBankTransactionBranch;
};

export type CashBankTransactionDetail = CashBankTransaction & {
  supplierPayment?: Record<string, unknown> | null;
  customerPayment?: Record<string, unknown> | null;
  pettyCashReplenishment?: Record<string, unknown> | null;
  salesReturn?: Record<string, unknown> | null;
};

export type CashBankTransactionListResponse = {
  items: CashBankTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getCashBankTransactions(
  query: CashBankTransactionQuery = {},
): Promise<CashBankTransactionListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.direction) {
    params.set("direction", query.direction);
  }

  if (query.transactionType) {
    params.set("transactionType", query.transactionType);
  }

  if (query.accountId) {
    params.set("accountId", query.accountId);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return apiFetch<CashBankTransactionListResponse>(
    `/cash-bank/transactions?${params.toString()}`,
  );
}

export async function getCashBankTransaction(
  id: string,
): Promise<CashBankTransactionDetail> {
  return apiFetch<CashBankTransactionDetail>(`/cash-bank/transactions/${id}`);
}
