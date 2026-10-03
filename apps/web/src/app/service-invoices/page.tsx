"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus2,
  Loader2,
  ReceiptText,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  getServiceInvoices,
  type ServiceInvoice,
  type ServiceInvoiceListResponse,
  type ServiceInvoiceStatus,
} from "@/features/service-repair/service-invoices-api";

const PAGE_SIZE = 10;

type SortBy = "invoiceNo" | "invoiceDate" | "total" | "status" | "createdAt";

type SortOrder = "asc" | "desc";

const statusOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All Statuses",
    description: "Show all service invoices",
  },
  {
    value: "POSTED",
    label: "Posted",
    description: "Posted service invoices",
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
    value: "total",
    label: "Total",
    description: "Sort by invoice total",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by invoice status",
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

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
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

function formatPaymentMode(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: ServiceInvoiceStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClasses(status: ServiceInvoiceStatus) {
  switch (status) {
    case "POSTED":
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

function getCustomerName(invoice: ServiceInvoice) {
  return invoice.customer.name?.trim() || invoice.customer.code;
}

export default function ServiceInvoicesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvoices() {
      try {
        const result: ServiceInvoiceListResponse = await getServiceInvoices({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status:
            status === "ALL" ? undefined : (status as ServiceInvoiceStatus),
          sortBy,
          sortOrder,
        });

        if (cancelled) return;

        setInvoices(result.data);

        setPagination({
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        });

        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load service invoices.",
        );
        setLoading(false);
      }
    }

    void loadInvoices();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, status, sortBy, sortOrder]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setError("");
    setLoading(true);
    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleClearSearch() {
    setError("");
    setLoading(true);
    setSearchInput("");
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(value: string) {
    if (value === status) return;

    setError("");
    setLoading(true);
    setStatus(value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortByChange(value: string) {
    const nextValue = value as SortBy;

    if (nextValue === sortBy) return;

    setError("");
    setLoading(true);
    setSortBy(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrderChange(value: string) {
    const nextValue = value as SortOrder;

    if (nextValue === sortOrder) return;

    setError("");
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
      nextPage > pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setError("");
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
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Services</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Service Invoices
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review invoices generated from completed service jobs.
            </p>
          </div>

          <Link
            href="/service-jobs"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <FilePlus2 className="h-4 w-4" />
            Service Jobs
          </Link>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">Unable to load service invoices</p>

              <p className="mt-0.5 break-words">{error}</p>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search invoice no., customer, service job..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Search
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-3 xl:w-[620px]">
              <SearchableSelect
                value={status}
                onChange={handleStatusChange}
                options={statusOptions}
                placeholder="Status"
                searchPlaceholder="Search status..."
                emptyMessage="No status found."
                disabled={loading && !invoices.length}
              />

              <SearchableSelect
                value={sortBy}
                onChange={handleSortByChange}
                options={sortByOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                emptyMessage="No sort field found."
                disabled={loading && !invoices.length}
              />

              <SearchableSelect
                value={sortOrder}
                onChange={handleSortOrderChange}
                options={sortOrderOptions}
                placeholder="Sort order"
                searchPlaceholder="Search sort order..."
                emptyMessage="No sort order found."
                disabled={loading && !invoices.length}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">
                Service Invoice Records
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>
            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
              <ReceiptText className="h-4 w-4" />
              Posted service invoices
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading service invoices...
              </div>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice No.
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Service Job
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Payment Mode
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Balance Due
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice Date
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/service-invoices/${invoice.id}`}
                          className="font-mono text-sm font-semibold text-primary hover:text-blue-700"
                        >
                          {invoice.invoiceNo}
                        </Link>

                        <p className="mt-1 text-xs text-slate-400">
                          {invoice.branch.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                          {getCustomerName(invoice)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {invoice.customer.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/service-jobs/${invoice.serviceJob.id}`}
                          className="font-mono text-sm font-medium text-slate-700 hover:text-primary"
                        >
                          {invoice.serviceJob.jobNo}
                        </Link>

                        <p className="mt-1 text-xs text-slate-400">
                          {invoice.serviceJob.status
                            .toLowerCase()
                            .replaceAll("_", " ")}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatPaymentMode(invoice.paymentMode)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          {formatCurrency(invoice.total)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            Number(invoice.balanceDue) > 0
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(invoice.balanceDue)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(invoice.invoiceDate)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClasses(
                            invoice.status,
                          )}`}
                        >
                          {formatStatus(invoice.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/service-invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
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
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ReceiptText className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                No service invoices found
              </p>

              <p className="mt-1 max-w-md text-xs text-slate-400">
                {search || status !== "ALL"
                  ? "Try changing your search or status filter."
                  : "Service invoices will appear here after completed service jobs are invoiced."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={
                  loading || pagination.page <= 1 || pagination.totalPages <= 1
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-white">
                {pagination.page}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={
                  loading ||
                  pagination.page >= pagination.totalPages ||
                  pagination.totalPages <= 1
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
