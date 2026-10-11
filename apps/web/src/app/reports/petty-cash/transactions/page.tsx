"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getPettyCashBalance,
  getPettyCashTransactions,
  type PettyCashTransactionsResponse,
} from "@/features/reports/reports-api";

const PAGE_SIZE = 10;

type FundOption = {
  id: string;
  fundNo: string;
  name: string;
  branchId: string;
};

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
    year: "numeric",
    month: "short",
    day: "numeric",
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
    : "Unable to load the petty cash report. Please try again.";
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
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
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

export default function PettyCashTransactionsPage() {
  const initialRange = getDefaultDateRange();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [fundId, setFundId] = useState("");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] = useState<PettyCashTransactionsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredFunds = funds.filter(
    (fund) => !branchId || fund.branchId === branchId,
  );

  const transactions = report?.transactions ?? [];
  const totalRows = report?.pagination.total ?? report?.count ?? 0;
  const totalPages = report?.pagination.pages ?? 1;

  const showingFrom = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, totalRows);

  // Load branch and fund options from existing APIs.
  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [branchData, balanceData] = await Promise.all([
          getBranches(),
          getPettyCashBalance(),
        ]);

        if (!active) return;

        const fundOptions = balanceData.funds
          .map((fund) => ({
            id: String(fund.fundId ?? ""),
            fundNo: String(fund.fundNo ?? ""),
            name: String(fund.name ?? ""),
            branchId: String(fund.branchId ?? ""),
          }))
          .filter((fund) => fund.id && fund.branchId);

        setBranches(branchData);
        setFunds(fundOptions);
        setReferenceError("");
      } catch (loadError: unknown) {
        if (active) {
          setReferenceError(getErrorMessage(loadError));
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

  // Fetch the selected page. Totals/count come from the full
  // filtered result returned by the backend.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getPettyCashTransactions({
          ...(branchId ? { branchId } : {}),
          ...(fundId ? { fundId } : {}),
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
  }, [branchId, fundId, from, to, page, limit, refreshKey]);

  function handleBranchChange(value: string) {
    setBranchId(value);
    setFundId("");
    setPage(1);
    setLoading(true);
  }

  function handleFundChange(value: string) {
    setFundId(value);
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

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports Center
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Wallet className="h-4 w-4" />
                Petty Cash Reports
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Petty Cash Transactions
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Review posted petty cash expenses and replenishments by fund,
                branch, and date range.
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
        </section>

        {/* Errors */}
        {(error || referenceError) && (
          <section className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error || referenceError}</p>
            </div>
          </section>
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
                htmlFor="petty-cash-branch"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>
              <select
                id="petty-cash-branch"
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
                htmlFor="petty-cash-fund"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Petty Cash Fund
              </label>
              <select
                id="petty-cash-fund"
                value={fundId}
                onChange={(event) => handleFundChange(event.target.value)}
                disabled={referenceLoading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              >
                <option value="">All funds</option>
                {filteredFunds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fundNo} — {fund.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="petty-cash-from"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                From
              </label>
              <input
                id="petty-cash-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => handleFromChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="petty-cash-to"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                To
              </label>
              <input
                id="petty-cash-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => handleToChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Money In"
            value={formatCurrency(report?.totalIn)}
            description="Posted fund replenishments matching the filters"
            icon={<TrendingUp className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            label="Total Money Out"
            value={formatCurrency(report?.totalOut)}
            description="Posted petty cash vouchers matching the filters"
            icon={<TrendingDown className="h-5 w-5" />}
            iconClass="bg-rose-50 text-rose-600"
          />

          <SummaryCard
            label="Net Movement"
            value={formatCurrency(report?.net)}
            description="Money in minus money out"
            icon={<Wallet className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Transactions"
            value={String(report?.count ?? 0)}
            description="Matching records across all pages"
            icon={<ClipboardList className="h-5 w-5" />}
            iconClass="bg-violet-50 text-violet-600"
          />
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Transaction Ledger
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {showingFrom}–{showingTo} of {totalRows} transactions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="petty-cash-page-size"
                className="text-sm text-slate-500"
              >
                Rows
              </label>
              <select
                id="petty-cash-page-size"
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
              Loading petty cash transactions...
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm text-slate-500">
              No report data is available. Check the filters or refresh.
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No posted petty cash transactions
              </h3>
              <p className="mt-1 max-w-lg text-sm text-slate-500">
                No posted vouchers or replenishments match the selected branch,
                fund, and date range.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Date</th>
                      <th className="px-5 py-3.5 font-semibold">Type</th>
                      <th className="px-5 py-3.5 font-semibold">Reference</th>
                      <th className="px-5 py-3.5 font-semibold">Fund</th>
                      <th className="px-5 py-3.5 font-semibold">Branch</th>
                      <th className="px-5 py-3.5 font-semibold">Description</th>
                      <th className="px-5 py-3.5 font-semibold">Category</th>
                      <th className="px-5 py-3.5 font-semibold">Payee</th>
                      <th className="px-5 py-3.5 font-semibold">Direction</th>
                      <th className="px-5 py-3.5 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => {
                      const isIncoming = transaction.direction === "IN";

                      return (
                        <tr
                          key={`${transaction.type}-${transaction.id}`}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {formatDateTime(transaction.date)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                transaction.type === "REPLENISHMENT"
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {transaction.type === "REPLENISHMENT"
                                ? "Replenishment"
                                : "Voucher"}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono text-xs text-slate-600">
                            <div>{transaction.referenceNo}</div>
                            {transaction.sourceReferenceNo && (
                              <div className="mt-1 text-slate-400">
                                Source: {transaction.sourceReferenceNo}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {transaction.fundName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {transaction.fundNo}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {transaction.branchName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {transaction.branchCode}
                            </div>
                          </td>

                          <td className="max-w-64 px-5 py-4 text-slate-600">
                            <span className="line-clamp-2">
                              {transaction.description || "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatLabel(transaction.category)}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {transaction.payee || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                isIncoming
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {isIncoming ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                              {isIncoming ? "Money In" : "Money Out"}
                            </span>
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                              isIncoming ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isIncoming ? "+" : "−"}
                            {formatCurrency(transaction.amount)}
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
                    {showingFrom}–{showingTo}
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
                      setLoading(true);
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
