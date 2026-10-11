"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Landmark,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";
import {
  getBankTransactions,
  type BankTransactionsResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

function getDefaultDateRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
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

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load bank transactions. Please try again.";
}

export default function BankTransactionsPage() {
  const defaultRange = getDefaultDateRange();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [referenceError, setReferenceError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] = useState<BankTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bankAccounts = accounts.filter(
    (account) =>
      account.accountType === "BANK" &&
      account.isActive &&
      (!branchId || account.branchId === branchId),
  );

  // Load branch and account options.
  useEffect(() => {
    let active = true;

    void Promise.all([getBranches(), getCashBankAccounts()])
      .then(([branchData, accountData]) => {
        if (!active) return;

        setBranches(branchData);
        setAccounts(accountData);
        setReferenceError("");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setReferenceError(getErrorMessage(loadError));
      });

    return () => {
      active = false;
    };
  }, []);

  // Fetch rows and summary totals from the API.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getBankTransactions({
          ...(branchId ? { branchId } : {}),
          ...(accountId ? { accountId } : {}),
          from,
          to,
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

    void loadReport();

    return () => {
      active = false;
    };
  }, [branchId, accountId, from, to, page, limit, refreshKey]);

  function handleBranchChange(value: string) {
    setBranchId(value);
    setAccountId("");
    setPage(1);
    setLoading(true);
  }

  function handleAccountChange(value: string) {
    setAccountId(value);
    setPage(1);
    setLoading(true);
  }

  function handleFromChange(value: string) {
    if (!value) return;

    setFrom(value);

    if (value > to) {
      setTo(value);
    }

    setPage(1);
    setLoading(true);
  }

  function handleToChange(value: string) {
    if (!value) return;

    setTo(value);

    if (value < from) {
      setFrom(value);
    }

    setPage(1);
    setLoading(true);
  }

  function handleLimitChange(value: number) {
    setLimit(value);
    setPage(1);
    setLoading(true);
  }

  function handleRefresh() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  const transactions = report?.transactions ?? [];
  const totalRows = report?.pagination.total ?? report?.count ?? 0;
  const totalPages = report?.pagination.pages ?? 1;

  const firstRow = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, totalRows);

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reports Center
        </Link>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Landmark className="h-4 w-4" />
              Cash / Bank Reports
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Bank Transactions
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review bank deposits, withdrawals, and net movement for the
              selected period.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Errors */}
        {(error || referenceError) && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error || referenceError}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Report Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="bank-branch"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>
              <select
                id="bank-branch"
                value={branchId}
                onChange={(event) => handleBranchChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All accessible branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bank-account"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Bank Account
              </label>
              <select
                id="bank-account"
                value={accountId}
                onChange={(event) => handleAccountChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All bank accounts</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.accountNumber ? ` — ${account.accountNumber}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bank-from"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                From
              </label>
              <input
                id="bank-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => handleFromChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="bank-to"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                To
              </label>
              <input
                id="bank-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => handleToChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Money In"
            value={formatCurrency(report?.totalIn)}
            description="All matching bank inflows"
            icon={<TrendingUp className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            label="Total Money Out"
            value={formatCurrency(report?.totalOut)}
            description="All matching bank outflows"
            icon={<TrendingDown className="h-5 w-5" />}
            iconClass="bg-rose-50 text-rose-600"
          />

          <SummaryCard
            label="Net Movement"
            value={formatCurrency(report?.net)}
            description="Money in minus money out"
            icon={<Banknote className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Transactions"
            value={String(report?.count ?? 0)}
            description="Matching bank transactions"
            icon={<FileBarChart className="h-5 w-5" />}
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        {/* Transactions table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Transaction Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {from} to {to}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="bank-page-size"
                className="text-sm text-slate-500"
              >
                Rows
              </label>
              <select
                id="bank-page-size"
                value={limit}
                onChange={(event) =>
                  handleLimitChange(Number(event.target.value))
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {loading && !report ? (
            <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading bank transactions...
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm text-slate-500">
              No report data is available. Check the filters or try refreshing.
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Landmark className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No bank transactions found
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                No bank transactions match the selected branch, account, and
                date range.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Date</th>
                      <th className="px-5 py-3.5 font-semibold">Branch</th>
                      <th className="px-5 py-3.5 font-semibold">
                        Bank Account
                      </th>
                      <th className="px-5 py-3.5 font-semibold">
                        Transaction Type
                      </th>
                      <th className="px-5 py-3.5 font-semibold">Reference</th>
                      <th className="px-5 py-3.5 font-semibold">Notes</th>
                      <th className="px-5 py-3.5 text-right font-semibold">
                        Money In
                      </th>
                      <th className="px-5 py-3.5 text-right font-semibold">
                        Money Out
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => {
                      const isIncoming = transaction.direction === "IN";

                      return (
                        <tr
                          key={transaction.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {formatDateTime(transaction.transactionDate)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {transaction.branch.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {transaction.branch.code}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {transaction.accountName ||
                                transaction.account.name}
                            </div>
                            {transaction.account.accountNumber && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {transaction.account.accountNumber}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {formatLabel(transaction.transactionType)}
                            </span>
                            <div className="mt-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  isIncoming
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {isIncoming ? (
                                  <ArrowDownLeft className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                )}
                                {isIncoming ? "Money In" : "Money Out"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {transaction.referenceNo || "—"}
                          </td>

                          <td className="max-w-56 px-5 py-4 text-slate-600">
                            <span className="line-clamp-2">
                              {transaction.notes || "—"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-700">
                            {isIncoming
                              ? formatCurrency(transaction.amount)
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-rose-700">
                            {!isIncoming
                              ? formatCurrency(transaction.amount)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {loading && (
                <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating report...
                </div>
              )}

              {/* Server-side pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {firstRow}–{lastRow}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {totalRows}
                  </span>{" "}
                  transactions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      setLoading(true);
                    }}
                    disabled={loading || page <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                      setLoading(true);
                    }}
                    disabled={loading || page >= totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}
