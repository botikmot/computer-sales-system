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
  getPurchaseRequestsAwaitingSupplierQuotation,
  getSupplierQuotations,
  type SupplierQuotation,
  type SupplierQuotationListResponse,
  type SupplierQuotationStatus,
} from "@/features/purchasing/supplier-quotations-api";

import type { PurchaseRequest } from "@/features/purchasing/purchase-requests-api";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | SupplierQuotationStatus;

type SortBy =
  | "quotationNo"
  | "quotationDate"
  | "validUntil"
  | "status"
  | "total"
  | "createdAt";

const statusOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All Statuses",
    description: "Show all supplier quotations",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "Quotation still being prepared",
  },
  {
    value: "RECEIVED",
    label: "Received",
    description: "Supplier quotation received",
  },
  {
    value: "ACCEPTED",
    label: "Accepted",
    description: "Quotation accepted for purchasing",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    description: "Quotation was rejected",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Quotation was cancelled",
  },
];

const sortByOptions: SelectOption[] = [
  {
    value: "quotationNo",
    label: "Quotation No.",
    description: "Sort by quotation number",
  },
  {
    value: "quotationDate",
    label: "Quotation Date",
    description: "Sort by quotation date",
  },
  {
    value: "validUntil",
    label: "Valid Until",
    description: "Sort by validity date",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by quotation status",
  },
  {
    value: "total",
    label: "Total",
    description: "Sort by quotation total",
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
    description: "Oldest / A → Z / Lowest first",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Newest / Z → A / Highest first",
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
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusClass(status: SupplierQuotationStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "RECEIVED":
      return "bg-blue-50 text-blue-700";

    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-rose-50 text-rose-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusLabel(status: SupplierQuotationStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "RECEIVED":
      return "Received";

    case "ACCEPTED":
      return "Accepted";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

function getTotalItems(quotation: SupplierQuotation) {
  return quotation.items.reduce((total, item) => total + item.quantity, 0);
}

function getPurchaseRequestItemCount(request: PurchaseRequest) {
  return request.items.reduce((total, item) => total + item.quantity, 0);
}

export default function SupplierQuotationsPage() {
  const [quotations, setQuotations] = useState<SupplierQuotation[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [awaitingRequests, setAwaitingRequests] = useState<PurchaseRequest[]>(
    [],
  );
  const [awaitingRequestsTotal, setAwaitingRequestsTotal] = useState(0);
  const [awaitingRequestsLoading, setAwaitingRequestsLoading] = useState(true);
  const [awaitingRequestsError, setAwaitingRequestsError] = useState("");

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

    async function fetchAwaitingRequests() {
      try {
        setAwaitingRequestsLoading(true);
        setAwaitingRequestsError("");

        const result = await getPurchaseRequestsAwaitingSupplierQuotation({
          page: 1,
          limit: 5,
        });

        if (cancelled) {
          return;
        }

        setAwaitingRequests(result.data);
        setAwaitingRequestsTotal(result.total);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setAwaitingRequestsError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase requests awaiting supplier quotation.",
        );
      } finally {
        if (!cancelled) {
          setAwaitingRequestsLoading(false);
        }
      }
    }

    void fetchAwaitingRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotations() {
      try {
        const result: SupplierQuotationListResponse =
          await getSupplierQuotations({
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

        setQuotations(result.data);

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
            : "Unable to load supplier quotations.",
        );

        setLoading(false);
      }
    }

    void fetchQuotations();

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

  function resetToFirstPage() {
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setLoading(true);
    setSearch(nextSearch);
    resetToFirstPage();
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setLoading(true);
    resetToFirstPage();
  }

  function handleStatusChange(value: string) {
    setLoading(true);
    setStatusFilter(value as StatusFilter);
    resetToFirstPage();
  }

  function handleSortByChange(value: string) {
    setLoading(true);
    setSortBy(value as SortBy);
    resetToFirstPage();
  }

  function handleSortOrderChange(value: string) {
    setLoading(true);
    setSortOrder(value as "asc" | "desc");
    resetToFirstPage();
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
          title="Supplier Quotations"
          description="Review supplier quotations received against approved purchase requests."
          action={
            <Link
              href="/supplier-quotations/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Supplier Quotation
            </Link>
          }
        />

        {awaitingRequestsLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading purchase requests awaiting supplier quotation...
            </div>
          </section>
        ) : awaitingRequestsError ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load quotation queue
                </p>

                <p className="mt-1 text-xs text-rose-700">
                  {awaitingRequestsError}
                </p>
              </div>
            </div>
          </section>
        ) : awaitingRequests.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Purchase Requests Awaiting Supplier Quotation
                      </p>

                      <p className="text-xs text-slate-500">
                        Approved requests that still need supplier pricing.
                      </p>
                    </div>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {awaitingRequestsTotal}{" "}
                  {awaitingRequestsTotal === 1 ? "awaiting" : "awaiting"}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {awaitingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/60 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/purchase-requests/${request.id}`}
                        className="text-sm font-semibold text-slate-900 transition hover:text-primary"
                      >
                        {request.requestNo}
                      </Link>

                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Approved
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>{request.purpose || "No purpose"}</span>

                      <span className="text-slate-300">•</span>

                      <span>{request.branch?.name || "—"}</span>

                      <span className="text-slate-300">•</span>

                      <span>
                        {request.items.length}{" "}
                        {request.items.length === 1
                          ? "line item"
                          : "line items"}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span>
                        {getPurchaseRequestItemCount(request)} total qty
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/supplier-quotations/new?purchaseRequestId=${request.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    Create Quotation
                  </Link>
                </div>
              ))}
            </div>

            {awaitingRequestsTotal > awaitingRequests.length && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Showing {awaitingRequests.length} of {awaitingRequestsTotal}{" "}
                  awaiting requests.
                </p>
              </div>
            )}
          </section>
        ) : null}

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
                    placeholder="Search quotation, supplier, or purchase request..."
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
                  Supplier Quotation Records
                </p>

                <p className="text-xs text-slate-400">
                  Quotations linked to approved purchase requests.
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
                    Unable to load supplier quotations
                  </p>

                  <p className="mt-1 text-xs text-rose-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-x-auto">
            {loading && quotations.length === 0 && (
              <div className="flex min-h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading supplier quotations...
                </div>
              </div>
            )}

            {!loading && !error && quotations.length === 0 && (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-900">
                  No supplier quotations found
                </p>

                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Supplier quotations will appear here once created from
                  approved purchase requests.
                </p>
              </div>
            )}

            {quotations.length > 0 && (
              <table className="w-full min-w-[1120px]">
                <thead className="border-b border-slate-100 bg-slate-50/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quotation No.
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Supplier
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Purchase Request
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Branch
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Items
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Total
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quotation Date
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {quotations.map((quotation) => (
                    <tr
                      key={quotation.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {quotation.quotationNo}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {quotation.id.slice(0, 8)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {quotation.supplier?.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {quotation.supplier?.code}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {quotation.purchaseRequest ? (
                          <Link
                            href={`/purchase-requests/${quotation.purchaseRequest.id}`}
                            className="group"
                          >
                            <p className="text-sm font-semibold text-slate-700 transition group-hover:text-primary">
                              {quotation.purchaseRequest.requestNo}
                            </p>

                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">
                              {quotation.purchaseRequest.purpose ||
                                "No purpose"}
                            </p>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {quotation.branch?.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {quotation.branch?.code}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {getTotalItems(quotation)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(quotation.total)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            getStatusClass(quotation.status),
                          ].join(" ")}
                        >
                          {getStatusLabel(quotation.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(quotation.quotationDate)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/supplier-quotations/${quotation.id}`}
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
