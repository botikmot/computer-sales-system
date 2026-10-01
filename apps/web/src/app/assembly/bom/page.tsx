"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getBillOfMaterials,
  type BillOfMaterial,
  type BomQuery,
} from "@/features/inventory/assembly-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

type SortBy = "finishedProduct" | "status" | "createdAt";

const sortByOptions: SelectOption[] = [
  {
    value: "finishedProduct",
    label: "Finished Product",
    description: "Sort by finished product name",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by BOM active status",
  },
  {
    value: "createdAt",
    label: "Date Created",
    description: "Sort by BOM creation date",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "A → Z / oldest → newest",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Z → A / newest → oldest",
  },
];

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

export default function BomPage() {
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;

    async function fetchBoms() {
      setLoading(true);
      setError("");

      try {
        const query: BomQuery = {
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          sortBy,
          sortOrder,
        };

        const result = await getBillOfMaterials(query);

        if (cancelled) {
          return;
        }

        setBoms(result.items);
        setPagination(result.pagination);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load BOM records.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchBoms();

    return () => {
      cancelled = true;
    };
  }, [page, search, sortBy, sortOrder]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setSearch(value.trim());
    setPage(1);
  }

  function handleSortByChange(value: string) {
    setSortBy(value as SortBy);
    setPage(1);
  }

  function handleSortOrderChange(value: string) {
    setSortOrder(value as "asc" | "desc");
    setPage(1);
  }

  const showingFrom =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Page Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/assembly"
                className="text-sm font-semibold text-slate-400 transition hover:text-primary"
              >
                Assembly
              </Link>

              <span className="text-slate-300">/</span>

              <span className="text-sm font-semibold text-primary">
                BOM Setup
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Bill of Materials
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Define the components required to produce each finished product.
            </p>
          </div>

          <Link
            href="/assembly/bom/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New BOM
          </Link>
        </section>

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search finished product or SKU..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Sort */}
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="min-w-[210px]">
                <SearchableSelect
                  value={sortBy}
                  onChange={handleSortByChange}
                  options={sortByOptions}
                  placeholder="Sort by"
                  searchPlaceholder="Search sort field..."
                  emptyMessage="No sort options found."
                />
              </div>

              <div className="min-w-[180px]">
                <SearchableSelect
                  value={sortOrder}
                  onChange={handleSortOrderChange}
                  options={sortOrderOptions}
                  placeholder="Sort order"
                  searchPlaceholder="Search sort order..."
                  emptyMessage="No sort orders found."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load BOM records</p>

              <p className="mt-1">{error}</p>
            </div>
          </section>
        )}

        {/* Records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">BOM Records</h2>
            </div>

            <p className="text-xs font-medium text-slate-400">
              Showing {showingFrom}–{showingTo} of {pagination.total}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading BOM records...
              </div>
            </div>
          ) : boms.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <ClipboardList className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                No BOM records found
              </p>

              <p className="mt-1 max-w-md text-sm text-slate-400">
                Create a BOM to define the components needed for an assembled
                product.
              </p>

              <Link
                href="/assembly/bom/new"
                className="mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Create New BOM
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Finished Product
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      BOM Name
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Components
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {boms.map((bom) => (
                    <tr
                      key={bom.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {bom.product?.name ?? "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {bom.product?.sku ?? "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {bom.name || bom.product?.name || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                          {bom.items?.length ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                            getStatusClass(bom.isActive),
                          ].join(" ")}
                        >
                          {bom.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(bom.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/assembly/bom/${bom.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.pages > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-blue-50 px-3 text-xs font-bold text-primary">
                  {pagination.page}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.pages, current + 1),
                    )
                  }
                  disabled={pagination.page >= pagination.pages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
