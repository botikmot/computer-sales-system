"use client";

import { Fragment, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileBarChart,
  Landmark,
  Loader2,
  RefreshCw,
  Scale,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";
import {
  getBankReconciliation,
  type BankReconciliationResponse,
  type BankReconciliationRow,
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
    : "Unable to load bank reconciliations. Please try again.";
}

function getStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "RECONCILED":
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "DRAFT":
      return "bg-slate-100 text-slate-700 ring-slate-200";

    case "PENDING":
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    default:
      return "bg-blue-50 text-blue-700 ring-blue-200";
  }
}

export default function BankReconciliationPage() {
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [report, setReport] = useState<BankReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bankAccounts = accounts.filter(
    (account) =>
      account.accountType === "BANK" &&
      account.isActive &&
      (!branchId || account.branchId === branchId),
  );

  const statusCounts = [...(report?.statusCounts ?? [])].sort((a, b) =>
    a.status.localeCompare(b.status),
  );

  // Load branch and bank account options.
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

  // Fetch reconciliation records using database pagination.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getBankReconciliation({
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
    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function handleAccountChange(value: string) {
    setAccountId(value);
    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function handleFromChange(value: string) {
    if (!value) return;

    setFrom(value);

    if (value > to) {
      setTo(value);
    }

    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function handleToChange(value: string) {
    if (!value) return;

    setTo(value);

    if (value < from) {
      setFrom(value);
    }

    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function handleLimitChange(value: number) {
    setLimit(value);
    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function handleRefresh() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  const reconciliations = report?.reconciliations ?? [];
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
              Bank Reconciliation
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review statement balances, book balances, adjustments, and
              reconciliation differences.
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
              <p className="font-semibold">
                Unable to load reconciliation report
              </p>
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
                htmlFor="reconciliation-branch"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>
              <select
                id="reconciliation-branch"
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
                htmlFor="reconciliation-account"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Bank Account
              </label>
              <select
                id="reconciliation-account"
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
                htmlFor="reconciliation-from"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Statement Date From
              </label>
              <input
                id="reconciliation-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => handleFromChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="reconciliation-to"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Statement Date To
              </label>
              <input
                id="reconciliation-to"
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
            label="Reconciliation Records"
            value={String(report?.count ?? 0)}
            description="Records matching the selected filters"
            icon={<FileBarChart className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-600"
          />

          {statusCounts.slice(0, 3).map((item) => (
            <SummaryCard
              key={item.status}
              label={`${formatLabel(item.status)} Records`}
              value={String(item.count)}
              description="Matching records across all pages"
              icon={<Scale className="h-5 w-5" />}
              iconClass="bg-slate-100 text-slate-600"
            />
          ))}
        </div>

        {/* Reconciliation table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Reconciliation Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Statement date range: {from} to {to}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="reconciliation-page-size"
                className="text-sm text-slate-500"
              >
                Rows
              </label>
              <select
                id="reconciliation-page-size"
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
              Loading bank reconciliations...
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm text-slate-500">
              No report data is available. Check the filters or try refreshing.
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Landmark className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No reconciliations found
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                No saved bank reconciliation records match the selected branch,
                account, and statement date range.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1450px] w-full text-left text-sm">
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
                        Adjusted Bank
                      </th>
                      <th className="px-4 py-3.5 text-right font-semibold">
                        Adjusted Book
                      </th>
                      <th className="px-4 py-3.5 text-right font-semibold">
                        Difference
                      </th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {reconciliations.map((record: BankReconciliationRow) => {
                      const isExpanded = expandedId === record.id;
                      const difference = Number(record.difference);

                      return (
                        <Fragment key={record.id}>
                          <tr className="transition hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : record.id)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                {record.items.length} item(s)
                              </button>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                              {record.reconciliationNo}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                              {formatDate(record.statementDate)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {record.branch.name}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {record.branch.code}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {record.account.name}
                              </div>
                              {record.account.accountNumber && (
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {record.account.accountNumber}
                                </div>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.statementEndingBalance)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.bookBalance)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.adjustedBankBalance)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">
                              {formatCurrency(record.adjustedBookBalance)}
                            </td>

                            <td
                              className={`whitespace-nowrap px-4 py-4 text-right font-semibold ${
                                Number.isFinite(difference) && difference !== 0
                                  ? "text-rose-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {formatCurrency(record.difference)}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(record.status)}`}
                              >
                                {formatLabel(record.status)}
                              </span>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${record.id}-items`}>
                              <td
                                colSpan={11}
                                className="bg-slate-50 px-5 py-5"
                              >
                                <div className="mb-3">
                                  <h3 className="font-semibold text-slate-900">
                                    Reconciliation Items
                                  </h3>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {record.notes || "No reconciliation notes."}
                                  </p>
                                </div>

                                {record.items.length === 0 ? (
                                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                                    No reconciliation items recorded.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="min-w-[850px] w-full text-left text-sm">
                                      <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                          <th className="px-4 py-3 font-semibold">
                                            Item Type
                                          </th>
                                          <th className="px-4 py-3 font-semibold">
                                            Reference
                                          </th>
                                          <th className="px-4 py-3 font-semibold">
                                            Linked Transaction
                                          </th>
                                          <th className="px-4 py-3 font-semibold">
                                            Transaction Direction
                                          </th>
                                          <th className="px-4 py-3 text-right font-semibold">
                                            Amount
                                          </th>
                                          <th className="px-4 py-3 font-semibold">
                                            Notes
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-slate-100">
                                        {record.items.map((item) => (
                                          <tr key={item.id}>
                                            <td className="px-4 py-3 text-slate-700">
                                              {formatLabel(item.type)}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600">
                                              {item.referenceNo ||
                                                item.cashBankTransaction
                                                  ?.referenceNo ||
                                                "—"}
                                            </td>

                                            <td className="px-4 py-3">
                                              {item.cashBankTransaction ? (
                                                <div>
                                                  <div className="font-medium text-slate-800">
                                                    {formatLabel(
                                                      item.cashBankTransaction
                                                        .transactionType,
                                                    )}
                                                  </div>
                                                  <div className="mt-0.5 text-xs text-slate-500">
                                                    {formatDate(
                                                      item.cashBankTransaction
                                                        .transactionDate,
                                                    )}
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="text-slate-500">
                                                  No linked transaction
                                                </span>
                                              )}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600">
                                              {item.cashBankTransaction
                                                ? formatLabel(
                                                    item.cashBankTransaction
                                                      .direction,
                                                  )
                                                : "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                                              {formatCurrency(item.amount)}
                                            </td>

                                            <td className="px-4 py-3 text-slate-600">
                                              {item.notes || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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
                  reconciliations
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      setExpandedId(null);
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
                      setExpandedId(null);
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
