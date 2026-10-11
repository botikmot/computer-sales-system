"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getPettyCashFunds,
  type PettyCashFund,
} from "@/features/petty-cash/petty-cash-api";
import {
  getPettyCashBalance,
  type PettyCashBalanceResponse,
} from "@/features/reports/reports-api";

const PAGE_SIZE = 10;

type BalanceFund = PettyCashBalanceResponse["funds"][number];

const initialResponse: PettyCashBalanceResponse = {
  count: 0,
  funds: [],
  summary: {
    openingBalance: 0,
    currentBalance: 0,
    totalExpenses: 0,
    totalReplenishments: 0,
  },
  pagination: {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  },
};

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(amount) ? amount : 0);
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

function getFundStatusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "INACTIVE":
      return "bg-slate-100 text-slate-600";
    case "SUSPENDED":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function PettyCashBalancePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fundOptions, setFundOptions] = useState<PettyCashFund[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [fundId, setFundId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [response, setResponse] =
    useState<PettyCashBalanceResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load reference data for branch and fund filters.
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
        setFundOptions(fundResult);
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

  // Fetch balance data using server-side pagination.
  useEffect(() => {
    let active = true;

    async function loadBalanceReport() {
      try {
        const result = await getPettyCashBalance({
          ...(branchId ? { branchId } : {}),
          ...(fundId ? { fundId } : {}),
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
            : "Unable to load the petty cash balance report.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBalanceReport();

    return () => {
      active = false;
    };
  }, [branchId, fundId, page, limit, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);
  const visibleFundOptions = fundOptions.filter(
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
              Petty Cash Balance
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review opening balances, posted activity, and current balances for
              each petty cash fund.
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

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold text-slate-950">Report Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {visibleFundOptions.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fundNo} — {fund.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Total Funds</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ClipboardList className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {totalRows.toLocaleString("en-PH")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Funds matching the selected filters
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Opening Balance
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Coins className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">
              {formatCurrency(response.summary.openingBalance)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Combined opening balances
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Replenishments
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">
              {formatCurrency(response.summary.totalReplenishments)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total posted replenishments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Total Expenses
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">
              {formatCurrency(response.summary.totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total posted voucher expenses
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Current Balance
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">
              {formatCurrency(response.summary.currentBalance)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Combined current fund balances
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

        {/* Petty cash balance ledger */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Petty Cash Balance Ledger
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading balances..."
                  : `Showing ${firstRecord}–${lastRecord} of ${totalRows} funds`}
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
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Fund No.</th>
                  <th className="px-4 py-3">Petty Cash Fund</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    Opening Balance
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    Replenishments
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    Expenses
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">
                    Current Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />
                      <span className="text-sm text-slate-500">
                        Loading petty cash balances...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && !error && response.funds.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-14 text-center text-sm text-slate-500"
                    >
                      <Wallet className="mx-auto mb-3 h-7 w-7 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        No petty cash funds found
                      </p>
                      <p className="mt-1">
                        Try selecting another branch or fund.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  response.funds.map((item: BalanceFund) => {
                    const fund = asRecord(item);
                    const branch = branches.find(
                      (candidate) =>
                        candidate.id === String(fund.branchId ?? ""),
                    );
                    const status = String(fund.status ?? "UNKNOWN");

                    return (
                      <tr
                        key={String(fund.fundId ?? fund.id)}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-slate-800">
                          {displayValue(fund.fundNo)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {displayValue(fund.name)}
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

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getFundStatusClass(status)}`}
                          >
                            {displayValue(fund.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(fund.openingBalance)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono tabular-nums text-emerald-700">
                          {formatCurrency(fund.totalReplenishments)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono tabular-nums text-rose-600">
                          {formatCurrency(fund.totalExpenses)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono font-bold tabular-nums text-slate-950">
                          {formatCurrency(fund.currentBalance)}
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
                ? "Showing 0 funds"
                : `Showing ${firstRecord}–${lastRecord} of ${totalRows} funds`}
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
