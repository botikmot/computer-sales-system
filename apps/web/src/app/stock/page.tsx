"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getInventoryStock,
  type InventoryStockItem,
} from "@/features/inventory/inventory-api";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type SortBy = "productName" | "sku" | "quantity" | "averageCost" | "updatedAt";

const sortByOptions: SelectOption[] = [
  {
    value: "productName",
    label: "Product",
    description: "Sort by product name",
  },
  {
    value: "sku",
    label: "SKU",
    description: "Sort by product SKU",
  },
  {
    value: "quantity",
    label: "Quantity",
    description: "Sort by current stock",
  },
  {
    value: "averageCost",
    label: "Average Cost",
    description: "Sort by average inventory cost",
  },
  {
    value: "updatedAt",
    label: "Last Updated",
    description: "Sort by latest inventory update",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "A → Z / lowest → highest",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Z → A / highest → lowest",
  },
];

export default function StockPage() {
  const [items, setItems] = useState<InventoryStockItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState<SortBy>("productName");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState("0");
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function fetchStock() {
      try {
        const result = await getInventoryStock({
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setItems(result.items);
        setTotalQuantity(result.totalQuantity);
        setTotalValue(String(result.totalValue));
        setTotalRecords(result.pagination.total);
        setTotalPages(Math.max(result.pagination.pages, 1));
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory stock.",
        );

        setLoading(false);
      }
    }

    void fetchStock();

    return () => {
      cancelled = true;
    };
  }, [page, search, sortBy, sortOrder]);

  const showingStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const pageNumbers = useMemo(() => {
    const pages = [];

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);

    for (let value = start; value <= end; value += 1) {
      pages.push(value);
    }

    return pages;
  }, [page, totalPages]);

  function changeSort(value: string) {
    setSortBy(value as SortBy);
    setPage(1);
  }

  function changeSortOrder(value: string) {
    setSortOrder(value as "asc" | "desc");
    setPage(1);
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section>
          <p className="text-sm font-semibold text-primary">Inventory</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Stock
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            View current inventory quantities, costs, and stock values across
            your business.
          </p>
        </section>

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search product, SKU, or category..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <SearchableSelect
                value={sortBy}
                onChange={changeSort}
                options={sortByOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                className="w-full sm:w-52"
              />

              <SearchableSelect
                value={sortOrder}
                onChange={changeSortOrder}
                options={sortOrderOptions}
                placeholder="Order"
                searchPlaceholder="Search order..."
                className="w-full sm:w-52"
              />
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Stock Records"
            value={formatNumber(totalRecords)}
            icon={<Boxes className="h-5 w-5" />}
          />

          <SummaryCard
            label="Total Quantity"
            value={formatNumber(totalQuantity)}
            icon={<Package className="h-5 w-5" />}
          />

          <SummaryCard
            label="Inventory Value"
            value={formatCurrency(totalValue)}
            icon={<Boxes className="h-5 w-5" />}
          />
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load stock</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Stock Records</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Current inventory balance by product and branch.
            </p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Loading stock records...
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Boxes className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No stock records found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search.
                </p>
              </div>
            ) : (
              <table className="min-w-[1050px] w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Branch
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Avg. Cost
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Inventory Value
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Updated
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`${item.branchId}-${item.productId}`}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-800">
                          {item.branchName}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-400">
                          {item.branchCode}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <Link
                          href={`/products/${item.productId}`}
                          className="font-semibold text-slate-900 transition hover:text-primary"
                        >
                          {item.productName}
                        </Link>

                        <div className="mt-0.5 text-xs text-slate-400">
                          {item.unit}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-600">
                        {item.sku}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.category ?? "Uncategorized"}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatNumber(item.quantity)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {formatCurrency(item.averageCost)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(item.inventoryValue)}
                      </td>

                      <td className="px-5 py-4 text-right text-xs text-slate-500">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && totalRecords > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {showingStart}
                </span>
                –
                <span className="font-semibold text-slate-700">
                  {showingEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {totalRecords}
                </span>
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={[
                      "h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition",
                      pageNumber === page
                        ? "bg-primary text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>

        <div className="rounded-xl bg-blue-50 p-2 text-primary">{icon}</div>
      </div>

      <div className="mt-3 text-xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}
