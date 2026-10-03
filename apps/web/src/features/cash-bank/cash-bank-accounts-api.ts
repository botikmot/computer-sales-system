import { apiFetch } from "@/lib/api/client";

export type CashBankAccount = {
  id: string;
  branchId: string;
  accountType: string;
  name: string;
  accountNumber?: string | null;
  openingBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getCashBankAccounts(): Promise<CashBankAccount[]> {
  return apiFetch<CashBankAccount[]>("/cash-bank/accounts");
}

export async function getCashBankAccount(id: string): Promise<CashBankAccount> {
  return apiFetch<CashBankAccount>(`/cash-bank/accounts/${id}`);
}

export type CashBankBalance = {
  accountId: string;
  accountType: string;
  name: string;
  openingBalance: string;
  currentBalance: string;
};

export async function getCashBankAccountBalance(
  id: string,
): Promise<CashBankBalance> {
  return apiFetch<CashBankBalance>(`/cash-bank/accounts/${id}/balance`);
}
