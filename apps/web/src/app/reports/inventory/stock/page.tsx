"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getInventoryStock,
  type InventoryStockResponse,
} from "@/features/reports/reports-api";

const PAGE_SIZE = 10;

type SortBy = "sku" | "productName" | "quantity" | "averageCost" | "updatedAt";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const sortByOptions: SelectOption[] = [
  {
    value: "productName",
    label: "Product Name",
    description: "Sort alphabetically by product name",
  },
  {
    value: "sku",
    label: "SKU",
    description: "Sort by product SKU",
  },
  {
    value: "quantity",
    label: "Quantity",
    description: "Sort by current stock quantity",
  },
  {
    value: "averageCost",
    label: "Average Cost",
    description: "Sort by average inventory cost",
  },
  {
    value: "updatedAt",
    label: "Updated At",
    description: "Sort by last inventory update",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "A → Z / Lowest → Highest",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Z → A / Highest → Lowest",
  },
];

function formatCurrency(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function SummaryCard({
  label,
  value,
  icon,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export default function InventoryStockReportPage() {
  const [report, setReport] = useState<InventoryStockResponse | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("productName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const result = await getInventoryStock({
          page,
          limit: PAGE_SIZE,
          search: activeSearch || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setReport(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory stock report.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [page, activeSearch, sortBy, sortOrder]);

  function handleSearch() {
    setPage(1);
    setActiveSearch(searchInput.trim());
  }

  function handleSortChange(nextSortBy: SortBy) {
    setPage(1);

    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder("asc");
  }

  function handlePageChange(nextPage: number) {
    if (!report?.pagination) {
      return;
    }

    if (nextPage < 1 || nextPage > report.pagination.pages || loading) {
      return;
    }

    setPage(nextPage);
  }

  const items = report?.items ?? [];
  const pagination = report?.pagination;

  const showingFrom =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;

  const showingTo =
    pagination && pagination.total > 0
      ? Math.min(pagination.page * pagination.limit, pagination.total)
      : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              Inventory Reports
            </span>

            <span className="text-slate-300">/</span>

            <span className="text-sm text-slate-500">
              Inventory Stock Report
            </span>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Inventory Stock Report
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review current inventory quantities, average costs, and inventory
              values across branches.
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Inventory Records"
            value={report?.count ?? 0}
            icon={<Boxes className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Quantity"
            value={report?.totalQuantity ?? 0}
            icon={<Package className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Inventory Value"
            value={formatCurrency(report?.totalValue ?? 0)}
            icon={<span className="text-sm font-bold">₱</span>}
            valueClassName="text-primary"
          />
        </section>

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-xl">
              <label
                htmlFor="inventorySearch"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
              >
                Search
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="inventorySearch"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="Search SKU, product name, or category..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>

              {activeSearch ? (
                <p className="mt-2 text-xs text-slate-500">
                  Searching for{" "}
                  <span className="font-semibold text-slate-700">
                    “{activeSearch}”
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label
                  htmlFor="sortBy"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  Sort By
                </label>

                <div className="w-full sm:min-w-52">
                  <label
                    htmlFor="sortBy"
                    className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                  >
                    Sort By
                  </label>

                  <SearchableSelect
                    value={sortBy}
                    onChange={(value) => handleSortChange(value as SortBy)}
                    options={sortByOptions}
                    placeholder="Select sort field"
                    searchPlaceholder="Search sort field..."
                    emptyMessage="No sort field found."
                  />
                </div>
              </div>

              <div className="w-full sm:min-w-52">
                <label
                  htmlFor="sortOrder"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  Sort Order
                </label>

                <SearchableSelect
                  value={sortOrder}
                  onChange={(value) => {
                    if (value !== "asc" && value !== "desc") {
                      return;
                    }

                    setPage(1);
                    setSortOrder(value);
                  }}
                  options={sortOrderOptions}
                  placeholder="Select sort order"
                  searchPlaceholder="Search sort order..."
                  emptyMessage="No sort order found."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Inventory Records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current stock balances from the inventory ledger.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading inventory stock...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Boxes className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No inventory records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try changing your search or check whether inventory balances
                have been recorded.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <TableHeader>Branch</TableHeader>
                      <TableHeader>SKU</TableHeader>
                      <TableHeader>Product</TableHeader>
                      <TableHeader>Category</TableHeader>
                      <TableHeader align="right">Quantity</TableHeader>
                      <TableHeader align="right">Average Cost</TableHeader>
                      <TableHeader align="right">Inventory Value</TableHeader>
                      <TableHeader>Updated</TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr
                        key={`${item.branchId}-${item.productId}`}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.branchName}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.branchCode}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                          {item.sku}
                        </td>

                        <td className="min-w-[220px] px-5 py-4 text-sm font-semibold text-slate-900">
                          {item.productName}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {item.category ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                          {item.quantity}{" "}
                          <span className="font-normal text-slate-400">
                            {item.unit}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                          {formatCurrency(item.averageCost)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                          {formatCurrency(item.inventoryValue)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.total > 0 ? (
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">
                    Showing {showingFrom}–{showingTo} of {pagination.total}
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>

                    <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white">
                      Page {pagination.page} of {Math.max(pagination.pages, 1)}
                    </span>

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.pages || loading}
                      onClick={() => handlePageChange(pagination.page + 1)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
