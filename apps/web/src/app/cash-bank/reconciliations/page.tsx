"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";
import {
  getCashBankTransactions,
  type CashBankTransaction,
} from "@/features/cash-bank/cash-bank-transactions-api";
import {
  addBankReconciliationItem,
  cancelBankReconciliation,
  completeBankReconciliation,
  createBankReconciliation,
  getBankReconciliations,
  type BankReconciliationItemType,
  type BankReconciliationRecord,
  type BankReconciliationListResponse,
} from "@/features/cash-bank/bank-reconciliations-api";
import { getBranches, type Branch } from "@/features/branches/branches-api";

const PAGE_SIZE = 10;

const itemTypeOptions: {
  value: BankReconciliationItemType;
  label: string;
  description: string;
}[] = [
  {
    value: "OUTSTANDING_CHECK",
    label: "Outstanding Check",
    description: "Uncleared bank payment",
  },
  {
    value: "DEPOSIT_IN_TRANSIT",
    label: "Deposit in Transit",
    description: "Recorded receipt not yet reflected by the bank",
  },
  {
    value: "BANK_CHARGE",
    label: "Bank Charge",
    description: "Bank fee deducted from the account",
  },
  {
    value: "BANK_CREDIT",
    label: "Bank Credit",
    description: "Interest or other credit from the bank",
  },
  {
    value: "OTHER",
    label: "Other Adjustment",
    description: "Other reconciliation information",
  },
];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function isLinkedTransactionType(type: BankReconciliationItemType) {
  return type === "OUTSTANDING_CHECK" || type === "DEPOSIT_IN_TRANSIT";
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function BankReconciliationsPage() {
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);

  const [report, setReport] = useState<BankReconciliationListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accountFilter, setAccountFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createAccountId, setCreateAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(getTodayDate);
  const [statementEndingBalance, setStatementEndingBalance] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [creating, setCreating] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [availableTransactions, setAvailableTransactions] = useState<
    CashBankTransaction[]
  >([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [itemType, setItemType] =
    useState<BankReconciliationItemType>("OUTSTANDING_CHECK");
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemReferenceNo, setItemReferenceNo] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  const bankAccounts = accounts.filter(
    (account) => account.accountType === "BANK",
  );

  const activeBankAccounts = bankAccounts.filter((account) => account.isActive);

  const records = report?.items ?? [];
  const pagination = report?.pagination;

  const totalRows = pagination?.total ?? 0;
  const totalPages = pagination?.pages ?? 1;
  const showingFrom = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, totalRows);

  const expandedRecord =
    records.find((record) => record.id === expandedId) ?? null;

  const selectedAccount =
    activeBankAccounts.find((account) => account.id === createAccountId) ??
    null;

  /* const selectedTransaction =
    availableTransactions.find(
      (transaction) => transaction.id === selectedTransactionId,
    ) ?? null; */

  const reconciliationTransactions = expandedRecord
    ? availableTransactions.filter((transaction) => {
        const transactionTime = new Date(transaction.transactionDate).getTime();
        const statementTime = new Date(expandedRecord.statementDate).getTime();

        if (
          !Number.isFinite(transactionTime) ||
          transactionTime > statementTime
        ) {
          return false;
        }

        if (itemType === "OUTSTANDING_CHECK") {
          return transaction.direction === "OUT";
        }

        if (itemType === "DEPOSIT_IN_TRANSIT") {
          return transaction.direction === "IN";
        }

        return false;
      })
    : [];

  // Load reference data.
  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [accountData, branchData] = await Promise.all([
          getCashBankAccounts(),
          getBranches(),
        ]);

        if (!active) return;

        setAccounts(accountData);
        setBranches(branchData);
      } catch (loadError: unknown) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setReferenceLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // Server-side paginated reconciliation list.
  useEffect(() => {
    let active = true;

    async function loadReconciliations() {
      try {
        setLoading(true);

        const result = await getBankReconciliations({
          accountId: accountFilter || undefined,
          page,
          limit,
        });

        if (!active) return;

        setReport(result);
        setError("");
      } catch (loadError: unknown) {
        if (!active) return;

        setReport(null);
        setError(getErrorMessage(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReconciliations();

    return () => {
      active = false;
    };
  }, [accountFilter, page, limit, refreshKey]);

  // Load bank transactions for the expanded reconciliation.
  useEffect(() => {
    const reconciliation = expandedRecord;

    if (!reconciliation) return;

    let active = true;

    async function loadTransactions() {
      try {
        setTransactionsLoading(true);

        const result = await getCashBankTransactions({
          accountId: reconciliation?.accountId,
          page: 1,
          limit: 100,
          sortBy: "transactionDate",
          sortOrder: "desc",
        });

        if (!active) return;

        setAvailableTransactions(result.items);
      } catch (loadError: unknown) {
        if (!active) return;

        setAvailableTransactions([]);
        setError(getErrorMessage(loadError));
      } finally {
        if (active) {
          setTransactionsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [expandedRecord]);

  async function handleCreateReconciliation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccount) {
      setError("Please select an active bank account.");
      return;
    }

    if (
      !statementDate ||
      statementEndingBalance.trim() === "" ||
      !Number.isFinite(Number(statementEndingBalance))
    ) {
      setError("Enter a valid statement date and ending balance.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      // Use the end of the selected local statement date so the
      // backend includes transactions posted during that day.
      const statementDateTime = new Date(
        `${statementDate}T23:59:59.999`,
      ).toISOString();

      const created = await createBankReconciliation({
        branchId: selectedAccount.branchId,
        accountId: selectedAccount.id,
        statementDate: statementDateTime,
        statementEndingBalance: statementEndingBalance.trim(),
        notes: createNotes.trim() || undefined,
      });

      setShowCreateForm(false);
      setAccountFilter(selectedAccount.id);
      setPage(1);
      setExpandedId(created.id);

      setStatementDate(getTodayDate());
      setStatementEndingBalance("");
      setCreateNotes("");
      setRefreshKey((current) => current + 1);
    } catch (createError: unknown) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  function handleItemTypeChange(value: BankReconciliationItemType) {
    setItemType(value);
    setSelectedTransactionId("");
    setItemAmount("");
    setItemReferenceNo("");
    setItemNotes("");
  }

  function handleTransactionChange(transactionId: string) {
    setSelectedTransactionId(transactionId);

    const transaction = availableTransactions.find(
      (item) => item.id === transactionId,
    );

    setItemAmount(transaction ? String(transaction.amount) : "");
    setItemReferenceNo(transaction?.referenceNo ?? "");
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!expandedRecord) return;

    const requiresTransaction = isLinkedTransactionType(itemType);

    if (
      !itemAmount.trim() ||
      !Number.isFinite(Number(itemAmount)) ||
      Number(itemAmount) <= 0
    ) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (requiresTransaction && !selectedTransactionId) {
      setError("Select a matching bank transaction for this item.");
      return;
    }

    try {
      setSavingItem(true);
      setError("");

      await addBankReconciliationItem(expandedRecord.id, {
        type: itemType,
        amount: itemAmount.trim(),
        ...(requiresTransaction
          ? { cashBankTransactionId: selectedTransactionId }
          : {}),
        referenceNo: itemReferenceNo.trim() || undefined,
        notes: itemNotes.trim() || undefined,
      });

      setItemType("OUTSTANDING_CHECK");
      setSelectedTransactionId("");
      setItemAmount("");
      setItemReferenceNo("");
      setItemNotes("");

      setRefreshKey((current) => current + 1);
    } catch (itemError: unknown) {
      setError(getErrorMessage(itemError));
    } finally {
      setSavingItem(false);
    }
  }

  async function handleComplete(record: BankReconciliationRecord) {
    if (Number(record.difference) !== 0) {
      setError(
        "This reconciliation cannot be completed while the difference is not zero.",
      );
      return;
    }

    if (!window.confirm(`Complete ${record.reconciliationNo}?`)) {
      return;
    }

    try {
      setActionLoadingId(record.id);
      setError("");

      await completeBankReconciliation(record.id);
      setRefreshKey((current) => current + 1);
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(record: BankReconciliationRecord) {
    if (!window.confirm(`Cancel ${record.reconciliationNo}?`)) {
      return;
    }

    try {
      setActionLoadingId(record.id);
      setError("");

      await cancelBankReconciliation(record.id);
      setRefreshKey((current) => current + 1);
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError));
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleAccountFilterChange(value: string) {
    setAccountFilter(value);
    setPage(1);
    setExpandedId(null);
  }

  function handleLimitChange(value: number) {
    setLimit(value);
    setPage(1);
    setExpandedId(null);
  }

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* HEADER */}
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/cash-bank"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Cash &amp; Bank
              </Link>

              <p className="mt-4 text-sm font-semibold text-primary">Finance</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Bank Reconciliation
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Match bank statements against your book balance, record
                adjustments, and resolve differences.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm((current) => !current);
                  setError("");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {showCreateForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {showCreateForm ? "Close Form" : "New Reconciliation"}
              </button>
            </div>
          </div>
        </section>

        {/* ERRORS */}
        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800">
                Reconciliation warning
              </p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-rose-500 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        {/* CREATE FORM */}
        {showCreateForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">
                  New Bank Reconciliation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use the ending balance from the bank statement for the
                  selected statement date.
                </p>
              </div>
            </div>

            {referenceLoading ? (
              <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bank accounts...
              </div>
            ) : activeBankAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No active bank accounts are available. Create or activate a BANK
                account first.
              </div>
            ) : (
              <form onSubmit={handleCreateReconciliation} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label
                      htmlFor="create-bank-account"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Bank Account *
                    </label>
                    <select
                      id="create-bank-account"
                      required
                      value={createAccountId}
                      onChange={(event) =>
                        setCreateAccountId(event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select bank account</option>
                      {activeBankAccounts.map((account) => {
                        const branchName =
                          branches.find(
                            (branch) => branch.id === account.branchId,
                          )?.name ?? account.branchId;

                        return (
                          <option key={account.id} value={account.id}>
                            {account.name} — {branchName}
                          </option>
                        );
                      })}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                      The branch is taken from the selected account.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="statement-date"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Statement Date *
                    </label>
                    <input
                      id="statement-date"
                      type="date"
                      required
                      value={statementDate}
                      onChange={(event) => setStatementDate(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="statement-ending-balance"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Statement Ending Balance *
                    </label>
                    <input
                      id="statement-ending-balance"
                      type="number"
                      step="0.01"
                      required
                      value={statementEndingBalance}
                      onChange={(event) =>
                        setStatementEndingBalance(event.target.value)
                      }
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-3">
                    <label
                      htmlFor="reconciliation-notes"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Notes
                    </label>
                    <textarea
                      id="reconciliation-notes"
                      rows={2}
                      value={createNotes}
                      onChange={(event) => setCreateNotes(event.target.value)}
                      placeholder="Optional notes about this bank statement..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {selectedAccount && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-800">
                      {selectedAccount.name}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {selectedAccount.accountNumber || "No account number"}{" "}
                      <span className="mx-1">·</span>
                      Opening balance:{" "}
                      <span className="font-medium text-slate-700">
                        {formatCurrency(selectedAccount.openingBalance)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating || referenceLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {creating ? "Creating..." : "Create Reconciliation"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Reconciliations"
            value={String(totalRows)}
            description="Records matching the current filter"
          />
          <SummaryCard
            label="Drafts"
            value={String(
              records.filter((record) => record.status === "DRAFT").length,
            )}
            description="Drafts on the current page"
          />
          <SummaryCard
            label="Completed"
            value={String(
              records.filter((record) => record.status === "COMPLETED").length,
            )}
            description="Completed records on the current page"
          />
        </section>

        {/* RECONCILIATION LIST */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Reconciliation Ledger
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {showingFrom}–{showingTo} of {totalRows} records
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="reconciliation-account-filter"
                  className="text-sm text-slate-500"
                >
                  Account
                </label>
                <select
                  id="reconciliation-account-filter"
                  value={accountFilter}
                  onChange={(event) =>
                    handleAccountFilterChange(event.target.value)
                  }
                  className="h-10 max-w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">All bank accounts</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="reconciliation-limit"
                  className="text-sm text-slate-500"
                >
                  Rows
                </label>
                <select
                  id="reconciliation-limit"
                  value={limit}
                  onChange={(event) =>
                    handleLimitChange(Number(event.target.value))
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {loading && !report ? (
            <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading reconciliations...
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Scale className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No reconciliation records yet
              </h3>
              <p className="mt-1 max-w-lg text-sm text-slate-500">
                Create a reconciliation using your bank statement ending
                balance. It will appear here after the API saves it.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Reconciliation
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Details</th>
                      <th className="px-4 py-3.5 font-semibold">
                        Reconciliation No.
                      </th>
                      <th className="px-4 py-3.5 font-semibold">
                        Statement Date
                      </th>
                      <th className="px-4 py-3.5 font-semibold">Branch</th>
                      <th className="px-4 py-3.5 font-semibold">
                        Bank Account
                      </th>
                      <th className="px-4 py-3.5 text-right font-semibold">
                        Statement Balance
                      </th>
                      <th className="px-4 py-3.5 text-right font-semibold">
                        Book Balance
                      </th>
                      <th className="px-4 py-3.5 text-right font-semibold">
                        Difference
                      </th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                      <th className="px-4 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => {
                      const isExpanded = expandedId === record.id;
                      const difference = Number(record.difference);

                      return (
                        <Fragment key={record.id}>
                          <tr className="transition hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(isExpanded ? null : record.id);
                                  setError("");
                                }}
                                aria-expanded={isExpanded}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                                {record.items.length} item(s)
                              </button>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                              {record.reconciliationNo}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                              {formatDate(record.statementDate)}
                            </td>

                            <td className="px-4 py-4 text-slate-700">
                              {record.branch?.name ??
                                branches.find(
                                  (branch) => branch.id === record.branchId,
                                )?.name ??
                                record.branchId}
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-900">
                                {record.account.name}
                              </p>
                              {record.account.accountNumber && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {record.account.accountNumber}
                                </p>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.statementEndingBalance)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.bookBalance)}
                            </td>

                            <td
                              className={`whitespace-nowrap px-4 py-4 text-right font-semibold ${
                                difference === 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {formatCurrency(record.difference)}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(record.status)}`}
                              >
                                {formatLabel(record.status)}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              {record.status === "DRAFT" ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleComplete(record)}
                                    disabled={
                                      actionLoadingId === record.id ||
                                      difference !== 0
                                    }
                                    title={
                                      difference !== 0
                                        ? "Difference must be zero before completing"
                                        : "Complete reconciliation"
                                    }
                                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {actionLoadingId === record.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    Complete
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleCancel(record)}
                                    disabled={actionLoadingId === record.id}
                                    className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No actions
                                </span>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="bg-slate-50 p-5">
                                <div className="space-y-5">
                                  {/* Balance details */}
                                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <SummaryCard
                                      label="Statement Ending Balance"
                                      value={formatCurrency(
                                        record.statementEndingBalance,
                                      )}
                                      description="Balance from the bank statement"
                                    />
                                    <SummaryCard
                                      label="Adjusted Bank Balance"
                                      value={formatCurrency(
                                        record.adjustedBankBalance,
                                      )}
                                      description="Statement balance after adjustments"
                                    />
                                    <SummaryCard
                                      label="Adjusted Book Balance"
                                      value={formatCurrency(
                                        record.adjustedBookBalance,
                                      )}
                                      description="Book balance after adjustments"
                                    />
                                    <SummaryCard
                                      label="Difference"
                                      value={formatCurrency(record.difference)}
                                      description={
                                        difference === 0
                                          ? "Balances are reconciled"
                                          : "Review adjustments to resolve this difference"
                                      }
                                    />
                                  </div>

                                  {record.notes && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Reconciliation Notes
                                      </p>
                                      <p className="mt-1 text-sm text-slate-700">
                                        {record.notes}
                                      </p>
                                    </div>
                                  )}

                                  {/* Items */}
                                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <div className="border-b border-slate-200 px-4 py-3">
                                      <h3 className="font-semibold text-slate-900">
                                        Reconciliation Items
                                      </h3>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Outstanding checks reduce the bank
                                        balance; deposits in transit increase
                                        it. Bank charges and credits adjust the
                                        book balance.
                                      </p>
                                    </div>

                                    {record.items.length === 0 ? (
                                      <p className="p-4 text-sm text-slate-500">
                                        No adjustments have been added.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-[850px] w-full text-left text-sm">
                                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                              <th className="px-4 py-3 font-semibold">
                                                Type
                                              </th>
                                              <th className="px-4 py-3 font-semibold">
                                                Transaction
                                              </th>
                                              <th className="px-4 py-3 font-semibold">
                                                Reference
                                              </th>
                                              <th className="px-4 py-3 font-semibold">
                                                Notes
                                              </th>
                                              <th className="px-4 py-3 text-right font-semibold">
                                                Amount
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody className="divide-y divide-slate-100">
                                            {record.items.map((item) => (
                                              <tr key={item.id}>
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                  {formatLabel(item.type)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                  {item.cashBankTransaction ? (
                                                    <div>
                                                      <span className="font-medium text-slate-700">
                                                        {formatLabel(
                                                          item
                                                            .cashBankTransaction
                                                            .transactionType,
                                                        )}
                                                      </span>
                                                      <p className="mt-0.5 text-xs text-slate-500">
                                                        {formatDateTime(
                                                          item
                                                            .cashBankTransaction
                                                            .transactionDate,
                                                        )}{" "}
                                                        ·{" "}
                                                        {
                                                          item
                                                            .cashBankTransaction
                                                            .direction
                                                        }
                                                      </p>
                                                    </div>
                                                  ) : (
                                                    "Manual adjustment"
                                                  )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                  {item.referenceNo ||
                                                    item.cashBankTransaction
                                                      ?.referenceNo ||
                                                    "—"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                  {item.notes || "—"}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                                                  {formatCurrency(item.amount)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Add item form — drafts only */}
                                  {record.status === "DRAFT" && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <h3 className="font-semibold text-slate-900">
                                        Add Reconciliation Item
                                      </h3>
                                      <p className="mt-1 text-sm text-slate-500">
                                        Link outstanding checks and deposits to
                                        their existing bank transactions. Enter
                                        amounts manually for bank charges,
                                        credits, or other adjustments.
                                      </p>

                                      <form
                                        onSubmit={handleAddItem}
                                        className="mt-4 space-y-4"
                                      >
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                          <div>
                                            <label
                                              htmlFor="reconciliation-item-type"
                                              className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                              Adjustment Type *
                                            </label>
                                            <select
                                              id="reconciliation-item-type"
                                              value={itemType}
                                              onChange={(event) =>
                                                handleItemTypeChange(
                                                  event.target
                                                    .value as BankReconciliationItemType,
                                                )
                                              }
                                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                            >
                                              {itemTypeOptions.map((option) => (
                                                <option
                                                  key={option.value}
                                                  value={option.value}
                                                >
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                            <p className="mt-1.5 text-xs text-slate-500">
                                              {
                                                itemTypeOptions.find(
                                                  (option) =>
                                                    option.value === itemType,
                                                )?.description
                                              }
                                            </p>
                                          </div>

                                          {isLinkedTransactionType(
                                            itemType,
                                          ) && (
                                            <div>
                                              <label
                                                htmlFor="reconciliation-transaction"
                                                className="mb-1.5 block text-sm font-medium text-slate-700"
                                              >
                                                Bank Transaction *
                                              </label>
                                              <select
                                                id="reconciliation-transaction"
                                                required
                                                value={selectedTransactionId}
                                                onChange={(event) =>
                                                  handleTransactionChange(
                                                    event.target.value,
                                                  )
                                                }
                                                disabled={transactionsLoading}
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                                              >
                                                <option value="">
                                                  {transactionsLoading
                                                    ? "Loading transactions..."
                                                    : "Select transaction"}
                                                </option>
                                                {reconciliationTransactions.map(
                                                  (transaction) => (
                                                    <option
                                                      key={transaction.id}
                                                      value={transaction.id}
                                                    >
                                                      {formatDate(
                                                        transaction.transactionDate,
                                                      )}{" "}
                                                      · {transaction.direction}{" "}
                                                      ·{" "}
                                                      {formatCurrency(
                                                        transaction.amount,
                                                      )}{" "}
                                                      ·{" "}
                                                      {formatLabel(
                                                        transaction.transactionType,
                                                      )}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                              {!transactionsLoading &&
                                                reconciliationTransactions.length ===
                                                  0 && (
                                                  <p className="mt-1.5 text-xs text-amber-700">
                                                    No matching transactions are
                                                    available for this item type
                                                    and statement date.
                                                  </p>
                                                )}
                                            </div>
                                          )}

                                          <div>
                                            <label
                                              htmlFor="reconciliation-item-amount"
                                              className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                              Amount *
                                            </label>
                                            <input
                                              id="reconciliation-item-amount"
                                              type="number"
                                              step="0.01"
                                              min="0.01"
                                              required
                                              value={itemAmount}
                                              onChange={(event) =>
                                                setItemAmount(
                                                  event.target.value,
                                                )
                                              }
                                              readOnly={isLinkedTransactionType(
                                                itemType,
                                              )}
                                              placeholder="0.00"
                                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 read-only:bg-slate-50"
                                            />
                                            {isLinkedTransactionType(
                                              itemType,
                                            ) && (
                                              <p className="mt-1.5 text-xs text-slate-500">
                                                Amount is taken from the
                                                selected transaction.
                                              </p>
                                            )}
                                          </div>

                                          <div>
                                            <label
                                              htmlFor="reconciliation-item-reference"
                                              className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                              Reference
                                            </label>
                                            <input
                                              id="reconciliation-item-reference"
                                              value={itemReferenceNo}
                                              onChange={(event) =>
                                                setItemReferenceNo(
                                                  event.target.value,
                                                )
                                              }
                                              placeholder="Optional reference number"
                                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                            />
                                          </div>

                                          <div className="md:col-span-2">
                                            <label
                                              htmlFor="reconciliation-item-notes"
                                              className="mb-1.5 block text-sm font-medium text-slate-700"
                                            >
                                              Notes
                                            </label>
                                            <input
                                              id="reconciliation-item-notes"
                                              value={itemNotes}
                                              onChange={(event) =>
                                                setItemNotes(event.target.value)
                                              }
                                              placeholder="Optional explanation"
                                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end border-t border-slate-100 pt-4">
                                          <button
                                            type="submit"
                                            disabled={
                                              savingItem ||
                                              (isLinkedTransactionType(
                                                itemType,
                                              ) &&
                                                (!selectedTransactionId ||
                                                  transactionsLoading))
                                            }
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {savingItem ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Plus className="h-4 w-4" />
                                            )}
                                            {savingItem
                                              ? "Adding Item..."
                                              : "Add Item"}
                                          </button>
                                        </div>
                                      </form>
                                    </div>
                                  )}

                                  {record.status === "DRAFT" &&
                                    difference !== 0 && (
                                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        The current difference is{" "}
                                        <strong>
                                          {formatCurrency(record.difference)}
                                        </strong>
                                        . Add the required adjustments and
                                        review the bank statement before
                                        completing.
                                      </div>
                                    )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {loading && (
                <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating reconciliations...
                </div>
              )}

              {/* SERVER-SIDE PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {showingFrom}–{showingTo}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {totalRows}
                  </span>{" "}
                  reconciliations
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      setExpandedId(null);
                    }}
                    disabled={loading || page <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <span className="min-w-24 text-center text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.min(totalPages, current + 1));
                      setExpandedId(null);
                    }}
                    disabled={loading || page >= totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
