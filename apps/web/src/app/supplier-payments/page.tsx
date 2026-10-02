"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSupplierPayments,
  type SupplierPayment,
  type SupplierPaymentListResponse,
} from "@/features/purchasing/supplier-payments-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

type SortBy = "paymentNo" | "paymentDate" | "amount" | "status" | "createdAt";

const sortByOptions: SelectOption[] = [
  {
    value: "paymentNo",
    label: "Payment No.",
    description: "Sort by payment number",
  },
  {
    value: "paymentDate",
    label: "Payment Date",
    description: "Sort by payment date",
  },
  {
    value: "amount",
    label: "Amount",
    description: "Sort by payment amount",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by payment status",
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
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
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

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("paymentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchSupplierPayments() {
      try {
        const result: SupplierPaymentListResponse = await getSupplierPayments({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setPayments(result.data);

        setPagination((current) => ({
          ...current,
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        }));

        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load supplier payments.",
        );

        setLoading(false);
      }
    }

    void fetchSupplierPayments();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, sortBy, sortOrder]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setLoading(true);
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

    setLoading(true);
  }

  function handleSortBy(value: string) {
    const nextValue = value as SortBy;

    if (nextValue === sortBy) {
      return;
    }

    setSortBy(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setLoading(true);
  }

  function handleSortOrder(value: string) {
    const nextValue = value as "asc" | "desc";

    if (nextValue === sortOrder) {
      return;
    }

    setSortOrder(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setLoading(true);
  }

  function handlePageChange(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));

    setLoading(true);
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
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Supplier Payments
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Record and review payments made to suppliers against outstanding
              accounts payable.
            </p>
          </div>

          <Link
            href="/supplier-payments/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Supplier Payment
          </Link>
        </section>

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form
              onSubmit={handleSearch}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="relative min-w-0 flex-1 xl:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search payment no., supplier, reference..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
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
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchableSelect
                value={sortBy}
                onChange={handleSortBy}
                options={sortByOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                emptyMessage="No sort field found."
                className="w-full sm:w-52"
              />

              <SearchableSelect
                value={sortOrder}
                onChange={handleSortOrder}
                options={sortOrderOptions}
                placeholder="Sort order"
                searchPlaceholder="Search sort order..."
                emptyMessage="No sort order found."
                className="w-full sm:w-44"
              />
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Unable to load supplier payments
              </p>

              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </section>
        )}

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Supplier Payment Records
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                {pagination.total === 0
                  ? "No supplier payment records"
                  : `Showing ${showingFrom}–${showingTo} of ${pagination.total}`}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <CreditCard className="h-4 w-4" />
              Posted supplier payments
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading supplier payments...
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CreditCard className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No supplier payments found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Supplier payments will appear here once payments are posted
                against accounts payable.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <TableHeader>Payment No.</TableHeader>
                      <TableHeader>Supplier</TableHeader>
                      <TableHeader>Accounts Payable</TableHeader>
                      <TableHeader>Account</TableHeader>
                      <TableHeader align="right">Amount</TableHeader>
                      <TableHeader>Payment Date</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader align="right">Action</TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50/40"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/supplier-payments/${payment.id}`}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            {payment.paymentNo}
                          </Link>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {payment.supplier.name}
                          </p>

                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {payment.supplier.code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-700">
                            {payment.accountsPayable.id.slice(0, 8)}...
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Balance{" "}
                            {formatCurrency(payment.accountsPayable.balanceDue)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {payment.cashBankTransaction.accountName}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {payment.accountType}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-950">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(payment.paymentDate)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                              payment.status,
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/supplier-payments/${payment.id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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

              {/* PAGINATION */}
              {pagination.totalPages > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-400">
                    Page {pagination.page} of {pagination.totalPages}
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
                      disabled={
                        pagination.page >= pagination.totalPages || loading
                      }
                      onClick={() => handlePageChange(pagination.page + 1)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
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
