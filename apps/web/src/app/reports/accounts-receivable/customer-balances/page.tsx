"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import {
  getAccountsReceivableCustomerBalances,
  type AccountsReceivableCustomerBalancesResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

function formatCurrency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load customer balances.";
}

export default function CustomerBalancesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] =
    useState<AccountsReceivableCustomerBalancesResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load branches for the filter.
  useEffect(() => {
    let active = true;

    getBranches()
      .then((result) => {
        if (active) {
          setBranches(result.filter((branch) => branch.isActive));
        }
      })
      .catch(() => {
        // The report can still load without branch filter options.
      });

    return () => {
      active = false;
    };
  }, []);

  // Load the selected page from the backend.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getAccountsReceivableCustomerBalances({
          branchId: branchId || undefined,
          page,
          limit,
        });

        if (!active) {
          return;
        }

        setReport(result);
        setError("");
      } catch (requestError: unknown) {
        if (active) {
          setError(getErrorMessage(requestError));
        }
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
  }, [branchId, page, limit, refreshKey]);

  function changeBranch(value: string) {
    setLoading(true);
    setBranchId(value);
    setPage(1);
  }

  function changeLimit(value: number) {
    setLoading(true);
    setLimit(value);
    setPage(1);
  }

  function refreshReport() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setLoading(true);
    setBranchId("");
    setPage(1);
    setRefreshKey((current) => current + 1);
  }

  const customers = report?.customers ?? [];
  const pagination = report?.pagination;

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileBarChart className="h-4 w-4" />
              Accounts Receivable Reports
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Customer Balances
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review recorded receivables, collected amounts, and remaining
              customer balances.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label
                htmlFor="branchFilter"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Branch
              </label>

              <select
                id="branchFilter"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
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
                htmlFor="pageSize"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Rows per page
              </label>

              <select
                id="pageSize"
                value={limit}
                onChange={(event) => changeLimit(Number(event.target.value))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 md:col-start-2"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Customers"
            value={formatNumber(report?.totals.customerCount ?? 0)}
            detail="Customers with recorded receivables"
            icon={<Users className="h-5 w-5" />}
          />

          <SummaryCard
            label="Receivable Records"
            value={formatNumber(report?.totals.receivableCount ?? 0)}
            detail="Matching receivable entries"
            icon={<FileBarChart className="h-5 w-5" />}
          />

          <SummaryCard
            label="Original Amount"
            value={formatCurrency(report?.totals.originalAmount)}
            detail="Combined recorded receivable amounts"
          />

          <SummaryCard
            label="Balance Due"
            value={formatCurrency(report?.totals.balanceDue)}
            detail="Combined remaining customer balances"
            icon={<Wallet className="h-5 w-5" />}
          />
        </section>

        {/* Customer table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                Customer Balance Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Sales and service receivables are combined per customer.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {formatNumber(report?.count ?? 0)} customers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Receivable Records
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Original Amount
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Amount Paid
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Balance Due
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading customer balances...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && !error && customers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No customer receivable records found for this filter.
                    </td>
                  </tr>
                )}

                {!loading &&
                  customers.map((row) => (
                    <tr
                      key={row.customer.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {row.customer.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                        {formatNumber(row.invoiceCount)}
                      </td>

                      <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                        {formatCurrency(row.originalAmount)}
                      </td>

                      <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                        {formatCurrency(row.amountPaid)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-950">
                        {formatCurrency(row.balanceDue)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Database-side pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
              {" · "}
              {formatNumber(pagination?.total ?? report?.count ?? 0)} customers
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPage((current) => Math.max(1, current - 1));
                }}
                disabled={
                  loading || (pagination ? pagination.page <= 1 : page <= 1)
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
                disabled={
                  loading ||
                  (pagination ? pagination.page >= pagination.pages : true)
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <p className="mt-3 break-words text-xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
