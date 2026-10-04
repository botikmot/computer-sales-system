import { apiFetch } from "@/lib/api/client";

export type PettyCashFundStatus = "ACTIVE" | "INACTIVE";

export type PettyCashVoucherStatus = "DRAFT" | "POSTED" | "VOIDED";

export type PettyCashReplenishmentStatus = "DRAFT" | "POSTED";

export type PettyCashCustodian = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  branchId?: string | null;
};

export type PettyCashBranch = {
  id: string;
  code: string;
  name: string;
};

export type PettyCashFund = {
  id: string;
  fundNo: string;
  branchId: string;
  name: string;
  custodianId?: string | null;
  openingBalance: string | number;
  currentBalance: string | number;
  status: PettyCashFundStatus;

  branch?: PettyCashBranch;

  custodian?: PettyCashCustodian | null;

  vouchers?: PettyCashVoucher[];
  replenishments?: PettyCashReplenishment[];

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PettyCashVoucher = {
  id: string;
  voucherNo: string;
  fundId: string;
  expenseDate: string;
  description: string;
  amount: string | number;
  category: string;
  payee?: string | null;
  referenceNo?: string | null;
  status: PettyCashVoucherStatus;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  fund?: PettyCashFund;
};

export type CreatePettyCashVoucherPayload = {
  expenseDate: string;
  description: string;
  amount: string | number;
  category: string;
  payee?: string;
  referenceNo?: string;
};

export type PettyCashAccount = {
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

export type PettyCashReplenishment = {
  id: string;
  replenishmentNo: string;
  fundId: string;
  accountId: string;
  replenishmentDate: string;
  amount: string | number;
  status: PettyCashReplenishmentStatus;
  referenceNo?: string | null;
  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  fund?: PettyCashFund;
  account?: PettyCashAccount;
};

export type CreatePettyCashReplenishmentPayload = {
  accountId: string;
  replenishmentDate: string;
  amount: string;
  referenceNo?: string;
  notes?: string;
};

export async function getPettyCashFunds(
  branchId?: string,
): Promise<PettyCashFund[]> {
  const params = new URLSearchParams();

  if (branchId) {
    params.set("branchId", branchId);
  }

  const queryString = params.toString();

  return apiFetch<PettyCashFund[]>(
    `/petty-cash/funds${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getPettyCashFund(id: string): Promise<PettyCashFund> {
  return apiFetch<PettyCashFund>(`/petty-cash/funds/${id}`);
}

export async function getPettyCashVouchers(
  fundId: string,
): Promise<PettyCashVoucher[]> {
  return apiFetch<PettyCashVoucher[]>(`/petty-cash/funds/${fundId}/vouchers`);
}

export async function createPettyCashVoucher(
  fundId: string,
  payload: CreatePettyCashVoucherPayload,
): Promise<PettyCashVoucher> {
  return apiFetch<PettyCashVoucher>(`/petty-cash/funds/${fundId}/vouchers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postPettyCashVoucher(
  voucherId: string,
): Promise<PettyCashVoucher> {
  return apiFetch<PettyCashVoucher>(`/petty-cash/vouchers/${voucherId}/post`, {
    method: "POST",
  });
}

export async function voidPettyCashVoucher(
  voucherId: string,
): Promise<PettyCashVoucher> {
  return apiFetch<PettyCashVoucher>(`/petty-cash/vouchers/${voucherId}/void`, {
    method: "POST",
  });
}

export async function getPettyCashReplenishments(
  fundId: string,
): Promise<PettyCashReplenishment[]> {
  return apiFetch<PettyCashReplenishment[]>(
    `/petty-cash/funds/${fundId}/replenishments`,
  );
}

export async function createPettyCashReplenishment(
  fundId: string,
  payload: CreatePettyCashReplenishmentPayload,
): Promise<PettyCashReplenishment> {
  return apiFetch<PettyCashReplenishment>(
    `/petty-cash/funds/${fundId}/replenishments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function postPettyCashReplenishment(
  replenishmentId: string,
): Promise<PettyCashReplenishment> {
  return apiFetch<PettyCashReplenishment>(
    `/petty-cash/replenishments/${replenishmentId}/post`,
    {
      method: "POST",
    },
  );
}
