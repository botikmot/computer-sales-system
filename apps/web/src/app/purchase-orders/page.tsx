"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import type { SupplierQuotation } from "@/features/purchasing/supplier-quotations-api";

import {
  getSupplierQuotationsAwaitingPurchaseOrder,
  getPurchaseOrders,
  type PurchaseOrder,
  type PurchaseOrderListResponse,
  type PurchaseOrderStatus,
} from "@/features/purchasing/purchase-orders-api";

const PAGE_SIZE = 10;

type SortBy =
  "poNumber" | "orderDate" | "expectedDate" | "status" | "total" | "createdAt";

const statusOptions: SelectOption[] = [
  {
    value: "DRAFT",
    label: "Draft",
    description: "Purchase order is still being prepared",
  },
  {
    value: "APPROVED",
    label: "Approved",
    description: "Purchase order has been approved",
  },
  {
    value: "SENT",
    label: "Sent",
    description: "Purchase order was sent to supplier",
  },
  {
    value: "PARTIALLY_RECEIVED",
    label: "Partially Received",
    description: "Some ordered items have been received",
  },
  {
    value: "RECEIVED",
    label: "Received",
    description: "Ordered items have been received",
  },
  {
    value: "CLOSED",
    label: "Closed",
    description: "Purchase order is completed and closed",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Purchase order was cancelled",
  },
];

const sortByOptions: SelectOption[] = [
  {
    value: "poNumber",
    label: "PO Number",
    description: "Sort by purchase order number",
  },
  {
    value: "orderDate",
    label: "Order Date",
    description: "Sort by purchase order date",
  },
  {
    value: "expectedDate",
    label: "Expected Date",
    description: "Sort by expected delivery date",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by purchase order status",
  },
  {
    value: "total",
    label: "Total",
    description: "Sort by purchase order total",
  },
  {
    value: "createdAt",
    label: "Created Date",
    description: "Sort by record creation date",
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
  }).format(date);
}

function getStatusClass(status: PurchaseOrderStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";

    case "SENT":
      return "bg-blue-50 text-blue-700";

    case "PARTIALLY_RECEIVED":
      return "bg-violet-50 text-violet-700";

    case "RECEIVED":
      return "bg-cyan-50 text-cyan-700";

    case "CLOSED":
      return "bg-slate-100 text-slate-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getTotalUnits(order: PurchaseOrder) {
  return order.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [awaitingQuotations, setAwaitingQuotations] = useState<
    SupplierQuotation[]
  >([]);

  const [awaitingQuotationsTotal, setAwaitingQuotationsTotal] = useState(0);
  const [awaitingQuotationsLoading, setAwaitingQuotationsLoading] =
    useState(true);
  const [awaitingQuotationsError, setAwaitingQuotationsError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAwaitingQuotations() {
      try {
        setAwaitingQuotationsLoading(true);
        setAwaitingQuotationsError("");

        const result = await getSupplierQuotationsAwaitingPurchaseOrder({
          page: 1,
          limit: 5,
        });

        if (cancelled) {
          return;
        }

        setAwaitingQuotations(result.data);
        setAwaitingQuotationsTotal(result.total);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setAwaitingQuotationsError(
          err instanceof Error
            ? err.message
            : "Unable to load accepted supplier quotations awaiting purchase order.",
        );
      } finally {
        if (!cancelled) {
          setAwaitingQuotationsLoading(false);
        }
      }
    }

    void fetchAwaitingQuotations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((current) => ({
        ...current,
        page: 1,
      }));
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPurchaseOrders() {
      try {
        setLoading(true);
        setError("");

        const result: PurchaseOrderListResponse = await getPurchaseOrders({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: status || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setItems(result.data);

        setPagination((current) => ({
          ...current,
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        }));

        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase orders.",
        );

        setLoading(false);
      }
    }

    void fetchPurchaseOrders();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, status, sortBy, sortOrder]);

  const selectedStatusOptions = useMemo(
    () => [
      {
        value: "",
        label: "All Statuses",
        description: "Show all purchase orders",
      },
      ...statusOptions,
    ],
    [],
  );

  const showingStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const showingEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];

    const start = Math.max(1, pagination.page - 2);
    const end = Math.min(pagination.totalPages, start + 4);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [pagination.page, pagination.totalPages]);

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(value: string) {
    setStatus(value as PurchaseOrderStatus | "");
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortChange(value: string) {
    setSortBy(value as SortBy);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrderChange(value: string) {
    setSortOrder(value as "asc" | "desc");
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function goToPage(page: number) {
    if (
      page < 1 ||
      page > Math.max(pagination.totalPages, 1) ||
      page === pagination.page
    ) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page,
    }));
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Purchase Orders
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage supplier purchase orders and monitor their delivery status.
            </p>
          </div>

          <Link
            href="/supplier-quotations"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <FileText className="h-4 w-4" />
            Supplier Quotations
          </Link>
        </section>

        {awaitingQuotationsLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading accepted supplier quotations...
            </div>
          </section>
        ) : awaitingQuotationsError ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load quotation queue
                </p>

                <p className="mt-1 text-xs text-rose-700">
                  {awaitingQuotationsError}
                </p>
              </div>
            </div>
          </section>
        ) : awaitingQuotations.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShoppingCart className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Accepted Supplier Quotations
                    </p>

                    <p className="text-xs text-slate-500">
                      Accepted quotations that still need a purchase order.
                    </p>
                  </div>
                </div>

                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {awaitingQuotationsTotal} awaiting
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {awaitingQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/60 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/supplier-quotations/${quotation.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-primary"
                      >
                        {quotation.quotationNo}
                      </Link>

                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Accepted
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>{quotation.supplier?.name || "—"}</span>

                      <span>•</span>

                      <span>
                        {quotation.purchaseRequest?.requestNo || "No PR"}
                      </span>

                      <span>•</span>

                      <span>{quotation.branch?.name || "—"}</span>

                      <span>•</span>

                      <span>{formatCurrency(quotation.total)}</span>
                    </div>
                  </div>

                  <Link
                    href={`/purchase-orders/new?supplierQuotationId=${quotation.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    Create Purchase Order
                  </Link>
                </div>
              ))}
            </div>

            {awaitingQuotationsTotal > awaitingQuotations.length && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Showing {awaitingQuotations.length} of{" "}
                  {awaitingQuotationsTotal} awaiting quotations.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_190px]">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search PO, supplier, or purchase request..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status */}
            <SearchableSelect
              value={status}
              onChange={handleStatusChange}
              options={selectedStatusOptions}
              placeholder="All statuses"
              searchPlaceholder="Search status..."
              emptyMessage="No status found."
            />

            {/* Sort */}
            <SearchableSelect
              value={sortBy}
              onChange={handleSortChange}
              options={sortByOptions}
              placeholder="Sort by"
              searchPlaceholder="Search sort field..."
              emptyMessage="No sort field found."
            />

            {/* Sort order */}
            <SearchableSelect
              value={sortOrder}
              onChange={handleSortOrderChange}
              options={sortOrderOptions}
              placeholder="Sort order"
              searchPlaceholder="Search sort order..."
              emptyMessage="No sort order found."
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load purchase orders</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Purchase Order Records
              </h2>

              <p className="text-xs text-slate-400">
                Showing {showingStart}–{showingEnd} of {pagination.total}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShoppingCart className="h-4 w-4" />
              {pagination.total} total records
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading purchase orders...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ShoppingCart className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No purchase orders found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <TableHeader>PO Number</TableHeader>
                      <TableHeader>Supplier</TableHeader>
                      <TableHeader>Purchase Request</TableHeader>
                      <TableHeader>Branch</TableHeader>
                      <TableHeader align="center">Items</TableHeader>
                      <TableHeader align="right">Total</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Order Date</TableHeader>
                      <TableHeader>Expected</TableHeader>
                      <TableHeader align="right">Action</TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/purchase-orders/${order.id}`}
                            className="text-sm font-bold text-slate-900 transition hover:text-primary"
                          >
                            {order.poNumber}
                          </Link>

                          {order.supplierQuotation?.quotationNo && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {order.supplierQuotation.quotationNo}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {order.supplier.name}
                          </p>

                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {order.supplier.code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {order.purchaseRequest ? (
                            <Link
                              href={`/purchase-requests/${order.purchaseRequest.id}`}
                              className="text-sm font-semibold text-slate-700 transition hover:text-primary"
                            >
                              {order.purchaseRequest.requestNo}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {order.branch.name}
                          </p>

                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {order.branch.code}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            <Package className="h-3.5 w-3.5" />
                            {getTotalUnits(order)}
                          </span>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {order.items.length} line
                            {order.items.length === 1 ? "" : "s"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(order.total)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(
                              order.status,
                            )}`}
                          >
                            {order.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(order.orderDate)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(order.expectedDate)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/purchase-orders/${order.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      className={[
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-xs font-bold transition",
                        page === pagination.page
                          ? "bg-primary text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      ].join(" ")}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.totalPages ||
                      pagination.totalPages === 0
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
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
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
