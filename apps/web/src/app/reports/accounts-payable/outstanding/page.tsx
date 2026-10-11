"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import { getSuppliers } from "@/features/purchasing/suppliers-api";

import {
  getAccountsPayableOutstanding,
  type AccountsPayableOutstandingResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load outstanding payables.";
}

function getStatusClass(status: string) {
  if (status === "PARTIALLY_PAID") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  return "bg-blue-50 text-blue-700 ring-blue-600/20";
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) {
    return false;
  }

  const due = new Date(dueDate);
  const now = new Date();

  if (Number.isNaN(due.getTime())) {
    return false;
  }

  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return due < now;
}

export default function OutstandingPayablesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] =
    useState<AccountsPayableOutstandingResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load branch and supplier options.
  useEffect(() => {
    let active = true;

    async function loadFilters() {
      try {
        const [branchResult, supplierResult] = await Promise.all([
          getBranches(),

          getSuppliers({
            page: 1,
            limit: 100,
            sortBy: "name",
            sortOrder: "asc",
          }),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchResult.filter((branch) => branch.isActive));

        setSuppliers(
          supplierResult.data.map((supplier) => ({
            id: supplier.id,
            code: supplier.code,
            name: supplier.name,
          })),
        );
      } catch {
        // The report can still load without filter options.
      }
    }

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  // Fetch the current page from the backend.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getAccountsPayableOutstanding({
          branchId: branchId || undefined,
          supplierId: supplierId || undefined,
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
  }, [branchId, supplierId, page, limit, refreshKey]);

  function changeBranch(value: string) {
    setLoading(true);
    setBranchId(value);
    setPage(1);
  }

  function changeSupplier(value: string) {
    setLoading(true);
    setSupplierId(value);
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
    setSupplierId("");
    setPage(1);
    setRefreshKey((current) => current + 1);
  }

  const records = report?.records ?? [];
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
              Accounts Payable Reports
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Outstanding Payables
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review unpaid supplier invoices and remaining balances.
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto] xl:items-end">
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
                htmlFor="supplierFilter"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Supplier
              </label>

              <select
                id="supplierFilter"
                value={supplierId}
                onChange={(event) => changeSupplier(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All suppliers</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} — {supplier.name}
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
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Outstanding Records
              </p>

              <FileBarChart className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {formatNumber(report?.count ?? 0)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Open or partially paid A/P entries with a balance due.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Total Outstanding
              </p>

              <Wallet className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">
              {formatCurrency(report?.total)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Sum of remaining balances for all matching records.
            </p>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                Outstanding Invoice Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                The balance shown is the remaining amount payable.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {formatNumber(report?.count ?? 0)} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Supplier / Invoice
                  </th>
                  <th className="px-5 py-3 font-semibold">Invoice Date</th>
                  <th className="px-5 py-3 font-semibold">Due Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
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
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading outstanding payables...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && !error && records.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No outstanding payables found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  records.map((record) => {
                    const overdue = isOverdue(record.dueDate);

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {record.supplier.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {record.supplier.code}
                          </p>

                          <p className="mt-2 text-xs font-medium text-slate-700">
                            {record.purchaseInvoice.invoiceNo}
                          </p>

                          {record.purchaseInvoice.supplierInvoiceNo && (
                            <p className="mt-1 text-xs text-slate-500">
                              Supplier Ref:{" "}
                              {record.purchaseInvoice.supplierInvoiceNo}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                          {formatDate(record.purchaseInvoice.invoiceDate)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              className={`h-4 w-4 ${
                                overdue ? "text-red-500" : "text-slate-400"
                              }`}
                            />

                            <span
                              className={
                                overdue
                                  ? "font-semibold text-red-600"
                                  : "text-slate-600"
                              }
                            >
                              {formatDate(record.dueDate)}
                            </span>
                          </div>

                          {overdue && (
                            <p className="mt-1 text-xs font-medium text-red-500">
                              Overdue
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(record.status)}`}
                          >
                            {record.status.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right tabular-nums text-slate-700">
                          {formatCurrency(record.originalAmount)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right tabular-nums text-slate-700">
                          {formatCurrency(record.amountPaid)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right font-semibold tabular-nums text-slate-950">
                          {formatCurrency(record.balanceDue)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Server-side pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
              {" · "}
              {formatNumber(pagination?.total ?? report?.count ?? 0)} records
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

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <FileBarChart className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <p>
            Totals cover every matching outstanding payable, not just the
            records displayed on the current page. Branch access is enforced by
            the backend.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
