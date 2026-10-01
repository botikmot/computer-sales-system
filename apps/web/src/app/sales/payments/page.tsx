"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Receipt,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getCustomerPayments,
  type CustomerPayment,
  type CustomerPaymentListResponse,
} from "@/features/sales/sales-api";

type PaymentSortField =
  "paymentNo" | "paymentDate" | "amount" | "status" | "createdAt";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

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

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

const sortOptions: {
  value: PaymentSortField;
  label: string;
}[] = [
  {
    value: "createdAt",
    label: "Created Date",
  },
  {
    value: "paymentDate",
    label: "Payment Date",
  },
  {
    value: "paymentNo",
    label: "Payment No.",
  },
  {
    value: "amount",
    label: "Amount",
  },
  {
    value: "status",
    label: "Status",
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);

  const [pagination, setPagination] = useState<
    CustomerPaymentListResponse["pagination"]
  >({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<PaymentSortField>("createdAt");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      try {
        setError("");

        const result = await getCustomerPayments({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          sortBy,
          sortOrder,
        });

        if (!cancelled) {
          setPayments(result.items);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load customer payments.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, sortBy, sortOrder]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    if (nextSearch === search) {
      return;
    }

    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setSearch(nextSearch);
  }

  function clearSearch() {
    setLoading(true);
    setSearchInput("");
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortChange(value: PaymentSortField) {
    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setSortBy(value);
  }

  function toggleSortOrder() {
    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  }

  function goToPage(page: number) {
    if (page < 1 || page > pagination.pages || page === pagination.page) {
      return;
    }

    setLoading(true);

    setPagination((current) => ({
      ...current,
      page,
    }));
  }

  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const rangeEnd =
    pagination.total === 0
      ? 0
      : Math.min(pagination.page * pagination.limit, pagination.total);

  const selectedSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label ??
    "Created Date";

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* PAGE HEADER */}
        <section>
          <p className="text-sm font-semibold text-primary">Sales</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Customer Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track customer collections and their cash or bank entries.
          </p>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load customer payments</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {/* SEARCH */}
            <form
              onSubmit={submitSearch}
              className="flex w-full gap-2 xl:max-w-[720px]"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search payment, customer, invoice..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                className="h-11 shrink-0 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>

              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="h-11 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
            </form>

            {/* SORT */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) =>
                    handleSortChange(event.target.value as PaymentSortField)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:w-[180px]"
                  aria-label="Sort field"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                type="button"
                onClick={toggleSortOrder}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {sortOrder === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>
        </section>

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {/* RECORD HEADER */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Payment Records
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Customer collections recorded in the system
              </p>
            </div>

            {!loading && (
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {rangeStart}
                </span>
                –
                <span className="font-semibold text-slate-700">{rangeEnd}</span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.total}
                </span>
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {search ? (
                  <Search className="h-6 w-6" />
                ) : (
                  <Receipt className="h-6 w-6" />
                )}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                {search
                  ? "No customer payments found"
                  : "No customer payments yet"}
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                {search
                  ? "Try a different search term."
                  : "Customer payments will appear here after a collection is recorded."}
              </p>
            </div>
          ) : (
            <>
              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Payment
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Invoice
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Account
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
                    {payments.map((payment) => {
                      const invoice =
                        payment.salesInvoice ?? payment.serviceInvoice;

                      return (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-slate-50"
                        >
                          {/* PAYMENT */}
                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {payment.paymentNo}
                            </p>

                            {payment.referenceNo && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                Ref: {payment.referenceNo}
                              </p>
                            )}
                          </td>

                          {/* CUSTOMER */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {payment.customer.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {payment.customer.code}
                            </p>
                          </td>

                          {/* INVOICE */}
                          <td className="px-5 py-4">
                            {invoice ? (
                              <p className="font-mono text-xs font-semibold text-slate-600">
                                {invoice.invoiceNo}
                              </p>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* DATE */}
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                            {formatDate(payment.paymentDate)}
                          </td>

                          {/* AMOUNT */}
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>

                          {/* ACCOUNT */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {payment.account.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {payment.account.accountType}
                            </p>
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                                payment.status,
                              )}`}
                            >
                              {payment.status}
                            </span>
                          </td>

                          {/* ACTION */}
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/sales/payments/${payment.id}`}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {pagination.pages}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-white"
                    aria-current="page"
                  >
                    {pagination.page}
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={
                      pagination.pages === 0 ||
                      pagination.page >= pagination.pages
                    }
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
