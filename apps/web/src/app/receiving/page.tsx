"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Truck,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getReceivings,
  type Receiving,
  type ReceivingListResponse,
} from "@/features/purchasing/receivings-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

type SortBy =
  "receivingNo" | "receivedDate" | "status" | "checkStatus" | "createdAt";

const sortByOptions: SelectOption[] = [
  {
    value: "receivingNo",
    label: "Receiving No.",
    description: "Sort by receiving number",
  },
  {
    value: "receivedDate",
    label: "Received Date",
    description: "Sort by receiving date",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by posting status",
  },
  {
    value: "checkStatus",
    label: "Check Status",
    description: "Sort by verification status",
  },
  {
    value: "createdAt",
    label: "Created Date",
    description: "Sort by creation date",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "Oldest / A → Z",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Newest / Z → A",
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getCheckStatusClass(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-blue-50 text-blue-700";

    case "PENDING":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ReceivingPage() {
  const [items, setItems] = useState<Receiving[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("receivedDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchReceivings() {
      try {
        setLoading(true);
        setError("");

        const result: ReceivingListResponse = await getReceivings({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setItems(result.items);
        setPagination(result.pagination);
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load receiving records.",
        );
        setLoading(false);
      }
    }

    void fetchReceivings();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, sortBy, sortOrder]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setLoading(true);
    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleClearSearch() {
    setSearchInput("");

    if (!search) {
      return;
    }

    setLoading(true);
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortBy(value: string) {
    const nextValue = value as SortBy;

    if (nextValue === sortBy) {
      return;
    }

    setLoading(true);
    setSortBy(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrder(value: string) {
    const nextValue = value as "asc" | "desc";

    if (nextValue === sortOrder) {
      return;
    }

    setLoading(true);
    setSortOrder(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handlePageChange(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > pagination.pages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
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
        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Receiving
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Receive supplier deliveries, verify quantities and quality, and
              post accepted stock into inventory.
            </p>
          </div>

          <Link
            href="/receiving/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Truck className="h-4 w-4" />
            New Receiving
          </Link>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load receiving records</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1 sm:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                  }}
                  placeholder="Search receiving no., PO, supplier, or reference..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                Search
              </button>

              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchableSelect
                value={sortBy}
                onChange={handleSortBy}
                options={sortByOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                className="w-full sm:w-52"
              />

              <SearchableSelect
                value={sortOrder}
                onChange={handleSortOrder}
                options={sortOrderOptions}
                placeholder="Order"
                searchPlaceholder="Search order..."
                className="w-full sm:w-48"
              />
            </div>
          </form>
        </section>

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Receiving Records
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>
            </div>

            <div className="text-xs text-slate-400">
              {pagination.pages > 0
                ? `Page ${pagination.page} of ${pagination.pages}`
                : "No records"}
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading receiving records...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Truck className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No receiving records found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Try a different search or create a new receiving report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <TableHeader>Receiving No.</TableHeader>
                    <TableHeader>Purchase Order</TableHeader>
                    <TableHeader>Supplier</TableHeader>
                    <TableHeader>Received Date</TableHeader>
                    <TableHeader>Check Status</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="right">Items</TableHeader>
                    <TableHeader align="right">Action</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {items.map((receiving) => (
                    <tr
                      key={receiving.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {receiving.receivingNo}
                        </span>

                        {receiving.referenceNo && (
                          <p className="mt-1 text-xs text-slate-400">
                            Ref: {receiving.referenceNo}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {receiving.purchaseOrder.poNumber}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {receiving.purchaseOrder.status}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700">
                          {receiving.purchaseOrder.supplier.name}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {formatDate(receiving.receivedDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getCheckStatusClass(
                            receiving.checkStatus,
                          )}`}
                        >
                          {receiving.checkStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                            receiving.status,
                          )}`}
                        >
                          {receiving.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-700">
                          {receiving.items.length}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/receiving/${receiving.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/20 hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {!loading && pagination.total > 0 && (
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
                  {pagination.page}
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
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
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
