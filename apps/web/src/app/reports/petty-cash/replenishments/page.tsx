"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getPettyCashFunds,
  type PettyCashFund,
} from "@/features/petty-cash/petty-cash-api";
import {
  getPettyCashReplenishments,
  type PettyCashReplenishmentsResponse,
} from "@/features/reports/reports-api";

type Replenishment = PettyCashReplenishmentsResponse["replenishments"][number];

const PAGE_SIZE = 10;

const initialResponse: PettyCashReplenishmentsResponse = {
  from: null,
  to: null,
  count: 0,
  total: 0,
  replenishments: [],
  pagination: {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  },
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

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function displayValue(value: unknown) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

export default function PettyCashReplenishmentsPage() {
  const initialRange = getDefaultDateRange();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [fundId, setFundId] = useState("");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [response, setResponse] =
    useState<PettyCashReplenishmentsResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load reference data for the branch and fund filters.
  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [branchResult, fundResult] = await Promise.all([
          getBranches(),
          getPettyCashFunds(),
        ]);

        if (!active) return;

        setBranches(branchResult);
        setFunds(fundResult);
        setOptionsError("");
      } catch (loadError: unknown) {
        if (!active) return;

        setOptionsError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load branch and fund filters.",
        );
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // Fetch replenishments with server-side pagination.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getPettyCashReplenishments({
          ...(branchId ? { branchId } : {}),
          ...(fundId ? { fundId } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          page,
          limit,
        });

        if (!active) return;

        setResponse(result);
        setError("");
      } catch (loadError: unknown) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the replenishment report.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [branchId, fundId, from, to, page, limit, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);

  const visibleFunds = funds.filter(
    (fund) => !branchId || fund.branchId === branchId,
  );

  const pagination = response.pagination;
  const totalRows = pagination.total ?? response.count;
  const totalPages = Math.max(1, pagination.pages ?? 1);
  const currentPage = pagination.page || page;
  const currentLimit = pagination.limit || limit;

  const firstRecord =
    totalRows === 0 ? 0 : (currentPage - 1) * currentLimit + 1;

  const lastRecord = Math.min(currentPage * currentLimit, totalRows);

  const averageAmount =
    totalRows > 0 ? Number(response.total ?? 0) / totalRows : 0;

  function changeBranch(value: string) {
    setBranchId(value);
    setFundId("");
    setPage(1);
    setLoading(true);
    setError("");
  }

  function changeFund(value: string) {
    setFundId(value);
    setPage(1);
    setLoading(true);
    setError("");
  }

  function changeFrom(value: string) {
    setFrom(value);

    if (value && to && value > to) {
      setTo(value);
    }

    setPage(1);
    setLoading(true);
    setError("");
  }

  function changeTo(value: string) {
    setTo(value);

    if (value && from && value < from) {
      setFrom(value);
    }

    setPage(1);
    setLoading(true);
    setError("");
  }

  function changeLimit(value: number) {
    setLimit(value);
    setPage(1);
    setLoading(true);
    setError("");
  }

  function changePage(value: number) {
    setPage(value);
    setLoading(true);
    setError("");
  }

  function handleRefresh() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/reports"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports Center
            </Link>

            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Wallet className="h-4 w-4" />
              Petty Cash Reports
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Petty Cash Replenishments
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review posted replenishments, funding accounts, references, and
              amounts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Reference data error */}
        {optionsError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">
                Filter options could not be loaded
              </p>

              <p className="mt-1">{optionsError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                Reload page
              </button>
            </div>
          </div>
        )}

        {/* Report filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold text-slate-950">Report Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Branch</span>

              <select
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                disabled={optionsLoading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">All accessible branches</option>

                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">
                Petty Cash Fund
              </span>

              <select
                value={fundId}
                onChange={(event) => changeFund(event.target.value)}
                disabled={optionsLoading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">All funds</option>

                {visibleFunds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fundNo} — {fund.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">From</span>

              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => changeFrom(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">To</span>

              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => changeTo(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Posted Replenishments
              </p>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ClipboardList className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {totalRows.toLocaleString("en-PH")}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Matching posted records across all pages
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Total Replenishment Amount
              </p>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Wallet className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {formatCurrency(response.total)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total amount for the selected filters
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Average Replenishment Amount
              </p>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FileText className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {formatCurrency(averageAmount)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total replenishment amount divided by count
            </p>
          </div>
        </section>

        {/* Report error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={handleRefresh}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Replenishment ledger */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Replenishment Ledger
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading records..."
                  : `Showing ${firstRecord}–${lastRecord} of ${totalRows} replenishments`}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Rows</span>

              <select
                value={limit}
                onChange={(event) => changeLimit(Number(event.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Date</th>
                  <th className="whitespace-nowrap px-4 py-3">
                    Replenishment No.
                  </th>
                  <th className="px-4 py-3">Fund</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Bank / Cash Account</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />

                      <span className="text-sm text-slate-500">
                        Loading replenishments...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && !error && response.replenishments.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-14 text-center text-sm text-slate-500"
                    >
                      <FileText className="mx-auto mb-3 h-7 w-7 text-slate-300" />

                      <p className="font-semibold text-slate-700">
                        No posted replenishments found
                      </p>

                      <p className="mt-1">
                        Try changing the branch, fund, or date range filters.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  response.replenishments.map((item: Replenishment) => {
                    const fund = asRecord(item.fund);
                    const account = asRecord(item.account);

                    const branch = branches.find(
                      (candidate) =>
                        candidate.id === String(fund.branchId ?? ""),
                    );

                    const accountName =
                      account.name ??
                      account.accountName ??
                      account.accountNo ??
                      account.accountNumber;

                    const status = displayValue(item.status);

                    return (
                      <tr
                        key={String(item.id)}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDate(item.replenishmentDate)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-slate-800">
                          {displayValue(item.replenishmentNo)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {displayValue(fund.name)}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {displayValue(fund.fundNo)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800">
                            {branch ? branch.name : "—"}
                          </div>

                          {branch && (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {branch.code}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {displayValue(accountName)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">
                          {displayValue(item.referenceNo)}
                        </td>

                        <td className="max-w-56 px-4 py-4 text-slate-600">
                          <span
                            className="block truncate"
                            title={displayValue(item.notes)}
                          >
                            {displayValue(item.notes)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            {status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-rose-600">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {totalRows === 0
                ? "Showing 0 replenishments"
                : `Showing ${firstRecord}–${lastRecord} of ${totalRows} replenishments`}
            </p>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={loading || page <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="whitespace-nowrap text-sm text-slate-500">
                Page {totalRows === 0 ? 1 : currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={loading || totalRows === 0 || page >= totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
