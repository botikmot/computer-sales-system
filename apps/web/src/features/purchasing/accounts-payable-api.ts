import { apiFetch } from "@/lib/api/client";

export type AccountsPayable = {
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

  createdAt: string;
  updatedAt: string;

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

  purchaseInvoice: Record<string, unknown>;
};

export async function getAccountsPayable(): Promise<AccountsPayable[]> {
  return apiFetch<AccountsPayable[]>("/accounts-payable");
}

export async function getAccountPayable(id: string): Promise<AccountsPayable> {
  return apiFetch<AccountsPayable>(`/accounts-payable/${id}`);
}
