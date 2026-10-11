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
  getAccountsPayableDueOverdue,
  type AccountsPayableDueOverdueResponse,
  type AccountsPayablePayablesBucket,
} from "@/features/reports/reports-api";
import Link from "next/link";

type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

type BucketKey = "overdue" | "due" | "noDueDate";

function getTodayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

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
    : "Unable to load the due / overdue payables report.";
}

function getBucketLabel(key: BucketKey) {
  if (key === "overdue") return "Overdue";
  if (key === "due") return "Due / Upcoming";
  return "No Due Date";
}

function getStatusClass(status: string) {
  return status === "PARTIALLY_PAID"
    ? "bg-amber-50 text-amber-700 ring-amber-600/20"
    : "bg-blue-50 text-blue-700 ring-blue-600/20";
}

export default function DueOverduePayablesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [asOfDate, setAsOfDate] = useState(getTodayLocalDate);

  const [activeTab, setActiveTab] = useState<BucketKey>("overdue");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] =
    useState<AccountsPayableDueOverdueResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the branch and supplier filters.
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
        // Report results can still load if filter options fail.
      }
    }

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  // Each bucket is paginated by the API using the same page/limit.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const result = await getAccountsPayableDueOverdue({
          branchId: branchId || undefined,
          supplierId: supplierId || undefined,
          asOfDate,
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
  }, [branchId, supplierId, asOfDate, page, limit, refreshKey]);

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

  function changeAsOfDate(value: string) {
    setLoading(true);
    setAsOfDate(value);
    setPage(1);
  }

  function changeLimit(value: number) {
    setLoading(true);
    setLimit(value);
    setPage(1);
  }

  function changeTab(value: BucketKey) {
    setActiveTab(value);
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
    setAsOfDate(getTodayLocalDate());
    setPage(1);
    setActiveTab("overdue");
    setRefreshKey((current) => current + 1);
  }

  const buckets = report
    ? {
        overdue: report.overdue,
        due: report.due,
        noDueDate: report.noDueDate,
      }
    : null;

  const activeBucket: AccountsPayablePayablesBucket | null = buckets
    ? buckets[activeTab]
    : null;

  const records = activeBucket?.records ?? [];
  const pagination = activeBucket?.pagination;

  const totalOutstanding =
    Number(report?.overdue.total ?? 0) +
    Number(report?.due.total ?? 0) +
    Number(report?.noDueDate.total ?? 0);

  const totalCount =
    (report?.overdue.count ?? 0) +
    (report?.due.count ?? 0) +
    (report?.noDueDate.count ?? 0);

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
              Due / Overdue Payables
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review outstanding supplier balances by due date.
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto] xl:items-end">
            <div>
              <label
                htmlFor="asOfDate"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                As of date
              </label>

              <input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(event) => changeAsOfDate(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

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

          <p className="mt-3 text-xs text-slate-500">
            Report classification is based on the selected as-of date.
          </p>
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
            label="Outstanding Records"
            value={formatNumber(totalCount)}
            detail="Matching records across all three categories"
            icon={<FileBarChart className="h-5 w-5" />}
          />

          <SummaryCard
            label="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            detail="All matching remaining balances"
            icon={<Wallet className="h-5 w-5" />}
          />

          <SummaryCard
            label="Overdue Balance"
            value={formatCurrency(report?.overdue.total)}
            detail={`${formatNumber(report?.overdue.count ?? 0)} overdue records`}
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <SummaryCard
            label="Due / Upcoming"
            value={formatCurrency(report?.due.total)}
            detail={`${formatNumber(report?.due.count ?? 0)} due or upcoming records`}
          />
        </section>

        {/* Buckets */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 pt-4">
            <div className="flex flex-wrap gap-2">
              {(["overdue", "due", "noDueDate"] as BucketKey[]).map((key) => {
                const bucket = buckets?.[key];
                const selected = activeTab === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeTab(key)}
                    className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold transition ${
                      selected
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {getBucketLabel(key)}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {formatNumber(bucket?.count ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                {getBucketLabel(activeTab)}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Total in this category: {formatCurrency(activeBucket?.total)}
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {formatNumber(activeBucket?.count ?? 0)} records
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
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
                        Loading {getBucketLabel(activeTab).toLowerCase()}{" "}
                        payables...
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
                      No records found in this category for the selected
                      filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  records.map((record) => (
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

                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {formatDate(record.dueDate)}
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
                  ))}
              </tbody>
            </table>
          </div>

          {/* Server-side pagination for the selected bucket */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
              {" · "}
              {formatNumber(pagination?.total ?? activeBucket?.count ?? 0)}{" "}
              records
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
  icon?: React.ReactNode;
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
