"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Download,
  Loader2,
  PackageSearch,
  Printer,
  RefreshCw,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getManagementInventoryValuation,
  type ManagementInventoryValuationResponse,
} from "@/features/reports/reports-api";

type InventoryValuationFilters = {
  branchId: string;
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const initialResponse: ManagementInventoryValuationResponse = {
  asOfDate: "",
  count: 0,
  totalQuantity: 0,
  totalValue: 0,
  items: [],
  pagination: {
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    pages: 1,
  },
};

function toNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDateLabel(value: string) {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T12:00:00`);
  if (Number.isNaN(date.getTime())) return datePart;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "emerald" | "violet";
}) {
  const toneClasses = {
    blue: { icon: "bg-blue-50 text-blue-700", value: "text-slate-950" },
    amber: { icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    },
    violet: { icon: "bg-violet-50 text-violet-700", value: "text-slate-950" },
  } as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-3 break-words text-2xl font-bold tracking-tight ${toneClasses[tone].value}`}
          >
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

export default function InventoryValuationPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<InventoryValuationFilters>({
      branchId: "",
    });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [response, setResponse] =
    useState<ManagementInventoryValuationResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      try {
        const result = await getBranches();
        if (!active) return;
        setBranches(result);
        setBranchesError("");
      } catch (loadError: unknown) {
        if (!active) return;
        setBranchesError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load branch options.",
        );
      } finally {
        if (active) setBranchesLoading(false);
      }
    }

    void loadBranches();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInventoryValuation() {
      try {
        const result = await getManagementInventoryValuation({
          ...(appliedFilters.branchId
            ? { branchId: appliedFilters.branchId }
            : {}),
          page,
          limit: pageSize,
        });
        if (!active) return;

        setResponse(result);
        setError("");
        if (result.pagination.page !== page) {
          setPage(result.pagination.page);
        }
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the inventory valuation report.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInventoryValuation();
    return () => {
      active = false;
    };
  }, [appliedFilters, page, pageSize, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);
  const selectedBranch = activeBranches.find(
    (branch) => branch.id === appliedFilters.branchId,
  );
  const pagination = response.pagination;
  const totalPages = Math.max(1, pagination.pages || 1);
  const firstItem =
    response.count === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, response.count);

  function applyFilters() {
    setLoading(true);
    setError("");
    setPage(1);
    setAppliedFilters({ branchId });
    setRefreshKey((current) => current + 1);
  }

  function resetFilters() {
    setBranchId("");
    setLoading(true);
    setError("");
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setAppliedFilters({ branchId: "" });
    setRefreshKey((current) => current + 1);
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(totalPages, Math.max(1, nextPage));
    if (safePage === page) return;
    setLoading(true);
    setError("");
    setPage(safePage);
  }

  function changePageSize(nextPageSize: number) {
    if (nextPageSize === pageSize) return;
    setLoading(true);
    setError("");
    setPage(1);
    setPageSize(nextPageSize);
  }

  return (
    <AppShell>
      <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports Center
          </Link>

          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <ClipboardList className="h-3.5 w-3.5" />
                Management / Financial
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Inventory Valuation Report
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review current on-hand inventory quantities and their value
                using each item’s average cost.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={refreshReport}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Report Filters
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div>
                <label
                  htmlFor="inventory-valuation-branch"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Branch
                </label>
                <select
                  id="inventory-valuation-branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  disabled={branchesLoading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">All accessible branches</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading || branchesLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-40"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Apply
                </button>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Reset
                </button>
              </div>
            </div>

            {branchesError ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Branch options could not be loaded: {branchesError}
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Current inventory snapshot
              {response.asOfDate
                ? ` reported ${formatDateLabel(response.asOfDate)}`
                : ""}
              {selectedBranch
                ? ` for ${selectedBranch.name}`
                : " across all accessible branches"}
              . Values use quantity × average cost; past dates are not
              reconstructed.
            </p>
          </section>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Unable to display this report</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
              <button
                type="button"
                onClick={refreshReport}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Inventory Value"
              value={formatCurrency(response.totalValue)}
              subtitle="Sum of quantity multiplied by average cost across all matching items"
              icon={Coins}
              tone="blue"
            />
            <SummaryCard
              title="Total Quantity"
              value={formatNumber(response.totalQuantity)}
              subtitle="Current on-hand quantity across matching inventory balances"
              icon={Boxes}
              tone="emerald"
            />
            <SummaryCard
              title="Inventory Records"
              value={formatNumber(response.count)}
              subtitle="Inventory balance records across the selected scope"
              icon={Warehouse}
              tone="violet"
            />
            <SummaryCard
              title="Current Page"
              value={`${Math.min(pagination.page, totalPages)} / ${totalPages}`}
              subtitle={`Showing up to ${pagination.limit} items per page`}
              icon={ClipboardList}
              tone="amber"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Inventory Valuation Details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {response.count === 0
                    ? "No inventory balance records found."
                    : `Showing ${firstItem}–${lastItem} of ${response.count} inventory records`}
                  {selectedBranch
                    ? ` · ${selectedBranch.name}`
                    : " · All accessible branches"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="inventory-valuation-page-size"
                  className="whitespace-nowrap text-xs font-medium text-slate-500"
                >
                  Rows per page
                </label>
                <select
                  id="inventory-valuation-page-size"
                  value={pageSize}
                  onChange={(event) =>
                    changePageSize(Number(event.target.value))
                  }
                  disabled={loading}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Branch
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      SKU
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Product
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Quantity
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Average Cost
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Inventory Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center text-sm text-slate-500"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading
                          inventory valuation…
                        </span>
                      </td>
                    </tr>
                  ) : response.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <PackageSearch className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            No inventory records found
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Try selecting another branch or check whether
                            inventory balances have been recorded.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    response.items.map((item) => (
                      <tr
                        key={`${item.branchId}-${item.productId}`}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {item.branchName || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-600">
                          {item.sku || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Product ID: {item.productId}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                          {formatCurrency(item.averageCost)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-950">
                          {formatCurrency(item.inventoryValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!loading && response.items.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/90">
                      <td
                        colSpan={3}
                        className="px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-800"
                      >
                        Current scope totals
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                        {formatNumber(response.totalQuantity)}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-500">
                        All records
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-950">
                        {formatCurrency(response.totalValue)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {response.count === 0
                  ? "0 items"
                  : `Showing ${firstItem}–${lastItem} of ${response.count} items`}
              </p>
              <div className="flex items-center justify-end gap-2">
                <span className="mr-1 text-xs font-medium text-slate-500">
                  Page {Math.min(pagination.page, totalPages)} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={loading || page <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={
                    loading || page >= totalPages || response.count === 0
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  How this valuation is calculated
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Each inventory balance is valued as{" "}
                  <span className="font-semibold text-slate-800">
                    quantity × average cost
                  </span>
                  . Summary totals cover all matching records, while the table
                  loads only the current page from the backend. This report is a
                  current snapshot and does not recreate historical inventory
                  for a past date.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
