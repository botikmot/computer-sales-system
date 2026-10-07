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
  Search,
  Truck,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  getPurchaseInvoices,
  getReceivingsAwaitingSupplierInvoice,
  type PurchaseInvoice,
} from "@/features/purchasing/purchase-invoices-api";

import type { Receiving } from "@/features/purchasing/receivings-api";

const PAGE_SIZE = 10;

type StatusFilter = "" | "DRAFT" | "POSTED" | "CANCELLED";

type SortBy =
  | "invoiceNo"
  | "invoiceDate"
  | "dueDate"
  | "total"
  | "balanceDue"
  | "status"
  | "createdAt";

const statusOptions: SelectOption[] = [
  {
    value: "",
    label: "All Statuses",
    description: "Show all supplier invoices",
  },
  {
    value: "POSTED",
    label: "Posted",
    description: "Invoice has been posted",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "Invoice is still being prepared",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Invoice was cancelled",
  },
];

const sortByOptions: SelectOption[] = [
  {
    value: "invoiceNo",
    label: "Invoice No.",
    description: "Sort by invoice number",
  },
  {
    value: "invoiceDate",
    label: "Invoice Date",
    description: "Sort by invoice date",
  },
  {
    value: "dueDate",
    label: "Due Date",
    description: "Sort by due date",
  },
  {
    value: "total",
    label: "Total",
    description: "Sort by invoice total",
  },
  {
    value: "balanceDue",
    label: "Balance Due",
    description: "Sort by outstanding balance",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by invoice status",
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
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getTotalAccepted(receiving: Receiving) {
  return receiving.items.reduce(
    (total, item) => total + item.quantityAccepted,
    0,
  );
}

export default function PurchaseInvoicesPage() {
  const [items, setItems] = useState<PurchaseInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const [sortBy, setSortBy] = useState<SortBy>("invoiceDate");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  const [awaitingReceivings, setAwaitingReceivings] = useState<Receiving[]>([]);

  const [awaitingTotal, setAwaitingTotal] = useState(0);
  const [awaitingLoading, setAwaitingLoading] = useState(true);
  const [awaitingError, setAwaitingError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");

        const result = await getPurchaseInvoices({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: statusFilter || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setItems(result.items);
        setPagination(result.pagination);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load supplier invoices.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoices();

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

  useEffect(() => {
    let cancelled = false;

    async function loadAwaitingReceivings() {
      try {
        setAwaitingLoading(true);
        setAwaitingError("");

        const result = await getReceivingsAwaitingSupplierInvoice({
          page: 1,
          limit: 5,
        });

        if (cancelled) {
          return;
        }

        setAwaitingReceivings(result.items);
        setAwaitingTotal(result.pagination.total);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setAwaitingError(
          err instanceof Error
            ? err.message
            : "Unable to load receivings awaiting supplier invoice.",
        );
      } finally {
        if (!cancelled) {
          setAwaitingLoading(false);
        }
      }
    }

    void loadAwaitingReceivings();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSearch(searchInput.trim());

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

    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value as StatusFilter);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortBy(value: string) {
    setSortBy(value as SortBy);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrder(value: string) {
    setSortOrder(value as "asc" | "desc");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  const firstItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Purchasing"
          title="Supplier Invoices"
          description="Manage supplier invoices from posted receiving reports and track outstanding balances."
        />

        {/* Awaiting invoice queue */}
        {awaitingLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading receivings awaiting supplier invoice...
            </div>
          </section>
        ) : awaitingError ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load invoice queue
                </p>

                <p className="mt-1 text-xs text-rose-700">{awaitingError}</p>
              </div>
            </div>
          </section>
        ) : awaitingReceivings.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/60 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Truck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Receivings Awaiting Supplier Invoice
                    </p>

                    <p className="text-xs text-slate-500">
                      Posted and verified deliveries that still need an invoice.
                    </p>
                  </div>
                </div>

                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  {awaitingTotal} awaiting
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {awaitingReceivings.map((receiving) => (
                <div
                  key={receiving.id}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/60 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/receiving/${receiving.id}`}
                        className="text-sm font-semibold text-slate-900 transition hover:text-primary"
                      >
                        {receiving.receivingNo}
                      </Link>

                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Posted
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>{receiving.purchaseOrder?.poNumber || "—"}</span>

                      <span>•</span>

                      <span>
                        {receiving.purchaseOrder?.supplier?.name || "—"}
                      </span>

                      <span>•</span>

                      <span>{receiving.branch?.name || "—"}</span>

                      <span>•</span>

                      <span>{getTotalAccepted(receiving)} accepted units</span>
                    </div>
                  </div>

                  <Link
                    href={`/purchase-invoices/new?receivingId=${receiving.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    Create Supplier Invoice
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Search / filters */}
        <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_240px_240px_220px]">
            <form onSubmit={handleSearch} className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search invoice, supplier, PO, receiving..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>

            <SearchableSelect
              value={statusFilter}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="All Statuses"
            />

            <SearchableSelect
              value={sortBy}
              onChange={handleSortBy}
              options={sortByOptions}
              placeholder="Invoice Date"
            />

            <SearchableSelect
              value={sortOrder}
              onChange={handleSortOrder}
              options={sortOrderOptions}
              placeholder="Descending"
            />
          </div>
        </section>

        {/* Records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Supplier Invoice Records
                </p>

                <p className="text-xs text-slate-500">
                  Supplier invoices linked to posted receiving reports.
                </p>
              </div>

              <span className="ml-auto text-xs text-slate-400">
                {pagination.total} total records
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading supplier invoices...
              </div>
            </div>
          ) : error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-rose-700">
                Unable to load supplier invoices
              </p>

              <p className="mt-1 text-xs text-slate-400">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                No supplier invoices found
              </p>

              <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                Supplier invoices will appear here once created from posted and
                verified receiving reports.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Invoice No.
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Supplier
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Purchase Order
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Receiving
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Total
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Balance Due
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Invoice Date
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="transition hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <Link
                              href={`/purchase-invoices/${invoice.id}`}
                              className="text-sm font-semibold text-slate-900 hover:text-primary"
                            >
                              {invoice.invoiceNo}
                            </Link>

                            {invoice.supplierInvoiceNo && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {invoice.supplierInvoiceNo}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {invoice.supplier.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {invoice.supplier.code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {invoice.purchaseOrder?.poNumber || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {invoice.receiving?.receivingNo || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(invoice.total)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatCurrency(invoice.balanceDue)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(
                              invoice.status,
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">
                            {formatDate(invoice.invoiceDate)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/purchase-invoices/${invoice.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Showing {firstItem}–{lastItem} of {pagination.total}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        page: current.page - 1,
                      }))
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white">
                    {pagination.page}
                  </div>

                  <button
                    type="button"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        page: current.page + 1,
                      }))
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
