import { apiFetch } from "@/lib/api/client";

export type BankReconciliationItemType =
  | "OUTSTANDING_CHECK"
  | "DEPOSIT_IN_TRANSIT"
  | "BANK_CHARGE"
  | "BANK_CREDIT"
  | "OTHER";

export type BankReconciliationStatus = "DRAFT" | "COMPLETED" | "CANCELLED";

export type BankReconciliationItem = {
  id: string;
  reconciliationId: string;
  type: BankReconciliationItemType;
  cashBankTransactionId?: string | null;
  amount: string | number;
  referenceNo?: string | null;
  notes?: string | null;
  cashBankTransaction?: {
    id: string;
    transactionDate: string;
    direction: "IN" | "OUT";
    transactionType: string;
    amount: string | number;
    referenceNo?: string | null;
  } | null;
};

export type BankReconciliationRecord = {
  id: string;
  reconciliationNo: string;
  branchId: string;
  accountId: string;
  statementDate: string;
  statementEndingBalance: string | number;
  bookBalance: string | number;
  adjustedBankBalance: string | number;
  adjustedBookBalance: string | number;
  difference: string | number;
  status: BankReconciliationStatus;
  notes?: string | null;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  account: {
    id: string;
    name: string;
    accountType: string;
    accountNumber?: string | null;
  };
  items: BankReconciliationItem[];
};

export type BankReconciliationListResponse = {
  items: BankReconciliationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CreateBankReconciliationPayload = {
  branchId: string;
  accountId: string;
  statementDate: string;
  statementEndingBalance: string;
  notes?: string;
};

export type AddBankReconciliationItemPayload = {
  type: BankReconciliationItemType;
  amount: string;
  cashBankTransactionId?: string;
  referenceNo?: string;
  notes?: string;
};

type BankReconciliationQuery = {
  branchId?: string;
  accountId?: string;
  page?: number;
  limit?: number;
};

function buildQuery(query: BankReconciliationQuery) {
  const params = new URLSearchParams();

  if (query.branchId) params.set("branchId", query.branchId);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function getBankReconciliations(
  query: BankReconciliationQuery = {},
): Promise<BankReconciliationListResponse> {
  return apiFetch<BankReconciliationListResponse>(
    `/cash-bank/reconciliations${buildQuery(query)}`,
  );
}

export async function createBankReconciliation(
  payload: CreateBankReconciliationPayload,
): Promise<BankReconciliationRecord> {
  return apiFetch<BankReconciliationRecord>("/cash-bank/reconciliations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addBankReconciliationItem(
  id: string,
  payload: AddBankReconciliationItemPayload,
): Promise<BankReconciliationRecord> {
  return apiFetch<BankReconciliationRecord>(
    `/cash-bank/reconciliations/${id}/items`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function completeBankReconciliation(
  id: string,
): Promise<BankReconciliationRecord> {
  return apiFetch<BankReconciliationRecord>(
    `/cash-bank/reconciliations/${id}/complete`,
    {
      method: "POST",
    },
  );
}

export async function cancelBankReconciliation(
  id: string,
): Promise<BankReconciliationRecord> {
  return apiFetch<BankReconciliationRecord>(
    `/cash-bank/reconciliations/${id}/cancel`,
    {
      method: "POST",
    },
  );
}
