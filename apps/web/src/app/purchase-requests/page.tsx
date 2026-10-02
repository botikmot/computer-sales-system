"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/ui/page-header";

import {
  getPurchaseRequests,
  type PurchaseRequest,
  type PurchaseRequestListResponse,
  type PurchaseRequestStatus,
} from "@/features/purchasing/purchase-requests-api";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | PurchaseRequestStatus;

type SortBy = "requestNo" | "purpose" | "status" | "createdAt";

const statusOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All Statuses",
    description: "Show all purchase requests",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "Requests still being prepared",
  },
  {
    value: "SUBMITTED",
    label: "Submitted",
    description: "Requests awaiting approval",
  },
  {
    value: "APPROVED",
    label: "Approved",
    description: "Requests approved for purchasing",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    description: "Requests that were rejected",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Requests that were cancelled",
  },
];

const sortByOptions: SelectOption[] = [
  {
    value: "requestNo",
    label: "Request No.",
    description: "Sort by purchase request number",
  },
  {
    value: "purpose",
    label: "Purpose",
    description: "Sort by request purpose",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by request status",
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

function getStatusClass(status: PurchaseRequestStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "SUBMITTED":
      return "bg-blue-50 text-blue-700";

    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-rose-50 text-rose-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusLabel(status: PurchaseRequestStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "SUBMITTED":
      return "Submitted";

    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

export default function PurchaseRequestsPage() {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchPurchaseRequests() {
      try {
        const result: PurchaseRequestListResponse = await getPurchaseRequests({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setPurchaseRequests(result.data);

        setPagination({
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.totalPages,
        });

        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase requests.",
        );

        setLoading(false);
      }
    }

    void fetchPurchaseRequests();

    return () => {
      cancelled = true;
    };
  }, [
    pagination.page,
    pagination.limit,
    search,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setPageAndReset(1);

    const nextSearch = searchInput.trim();

    setSearch(nextSearch);
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setLoading(true);
    setPageAndReset(1);
  }

  function handleStatusChange(value: string) {
    setLoading(true);
    setStatusFilter(value as StatusFilter);
    setPageAndReset(1);
  }

  function handleSortByChange(value: string) {
    setLoading(true);
    setSortBy(value as SortBy);
    setPageAndReset(1);
  }

  function handleSortOrderChange(value: string) {
    setLoading(true);
    setSortOrder(value as "asc" | "desc");
    setPageAndReset(1);
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || (pagination.pages > 0 && nextPage > pagination.pages)) {
      return;
    }

    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  function setPageAndReset(nextPage: number) {
    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  const showingFrom =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const showingTo =
    pagination.total === 0
      ? 0
      : Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Purchasing"
          title="Purchase Requests"
          description="Create, review, and track internal requests for stock replenishment and purchasing."
          action={
            <Link
              href="/purchase-requests/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Purchase Request
            </Link>
          }
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex flex-col gap-4">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search request no., purpose, or notes..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />

                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
              </form>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SearchableSelect
                  value={statusFilter}
                  onChange={handleStatusChange}
                  options={statusOptions}
                  placeholder="Filter by status"
                  searchPlaceholder="Search status..."
                  emptyMessage="No status found."
                />

                <SearchableSelect
                  value={sortBy}
                  onChange={handleSortByChange}
                  options={sortByOptions}
                  placeholder="Sort by"
                  searchPlaceholder="Search sort field..."
                  emptyMessage="No sort field found."
                />

                <SearchableSelect
                  value={sortOrder}
                  onChange={handleSortOrderChange}
                  options={sortOrderOptions}
                  placeholder="Sort order"
                  searchPlaceholder="Search order..."
                  emptyMessage="No sort order found."
                />
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Purchase Request Records
                </p>

                <p className="text-xs text-slate-400">
                  Internal requests linked to future supplier purchasing.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Unable to load purchase requests
                  </p>

                  <p className="mt-1 text-xs text-rose-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-x-auto">
            {loading && purchaseRequests.length === 0 && (
              <div className="flex min-h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading purchase requests...
                </div>
              </div>
            )}

            {!loading && !error && purchaseRequests.length === 0 && (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-900">
                  No purchase requests found
                </p>

                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Create a purchase request to start the purchasing workflow.
                </p>
              </div>
            )}

            {purchaseRequests.length > 0 && (
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Request No.
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Branch
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Purpose
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Items
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {purchaseRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {request.requestNo}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {request.id.slice(0, 8)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {request.branch?.name ?? "—"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {request.branch?.code ?? "—"}
                          </p>
                        </div>
                      </td>

                      <td className="max-w-[280px] px-5 py-4">
                        <p className="truncate text-sm text-slate-700">
                          {request.purpose || "No purpose specified"}
                        </p>

                        {request.notes && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {request.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {request.items.length}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            getStatusClass(request.status),
                          ].join(" ")}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(request.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/purchase-requests/${request.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination.total > 0 && (
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

                <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white">
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
