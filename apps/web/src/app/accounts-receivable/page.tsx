"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getAccountsReceivable,
  type AccountsReceivable,
  type AccountsReceivableQuery,
  type AccountsReceivableSortField,
  type AccountsReceivableStatus,
} from "@/features/sales/accounts-receivable-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

const statusOptions: SelectOption[] = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "OPEN",
    label: "Open",
  },
  {
    value: "PARTIALLY_PAID",
    label: "Partially Paid",
  },
  {
    value: "PAID",
    label: "Paid",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

const sortOptions: SelectOption[] = [
  {
    value: "createdAt",
    label: "Created Date",
  },
  {
    value: "dueDate",
    label: "Due Date",
  },
  {
    value: "originalAmount",
    label: "Original Amount",
  },
  {
    value: "amountPaid",
    label: "Amount Paid",
  },
  {
    value: "balanceDue",
    label: "Balance Due",
  },
  {
    value: "status",
    label: "Status",
  },
  {
    value: "updatedAt",
    label: "Updated Date",
  },
];

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function getStatusClass(status: AccountsReceivableStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-50 text-blue-700";

    case "PARTIALLY_PAID":
      return "bg-amber-50 text-amber-700";

    case "PAID":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatStatus(status: AccountsReceivableStatus) {
  switch (status) {
    case "PARTIALLY_PAID":
      return "Partially Paid";

    case "CANCELLED":
      return "Cancelled";

    case "OPEN":
      return "Open";

    case "PAID":
      return "Paid";

    default:
      return status;
  }
}

function getInvoiceType(record: AccountsReceivable) {
  if (record.salesInvoice) {
    return "Sales";
  }

  if (record.serviceInvoice) {
    return "Service";
  }

  return "—";
}

function getInvoiceNumber(record: AccountsReceivable) {
  return (
    record.salesInvoice?.invoiceNo ??
    record.serviceInvoice?.invoiceNo ??
    "No invoice"
  );
}

export default function AccountsReceivablePage() {
  const [records, setRecords] = useState<AccountsReceivable[]>([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [status, setStatus] = useState<AccountsReceivableStatus | "">("");

  const [sortBy, setSortBy] =
    useState<AccountsReceivableSortField>("createdAt");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccountsReceivable() {
      try {
        setError("");

        const query: AccountsReceivableQuery = {
          page,
          limit: PAGE_SIZE,
          search: activeSearch || undefined,
          status: status || undefined,
          sortBy,
          sortOrder,
        };

        const result = await getAccountsReceivable(query);

        if (cancelled) {
          return;
        }

        setRecords(result.items);
        setPages(result.pagination.pages);
        setTotal(result.pagination.total);

        if (result.pagination.page !== page) {
          setPage(result.pagination.page);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load accounts receivable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccountsReceivable();

    return () => {
      cancelled = true;
    };
  }, [page, activeSearch, status, sortBy, sortOrder]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setActiveSearch(search.trim());
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setLoading(true);
    setStatus(value as AccountsReceivableStatus | "");
    setPage(1);
  }

  function handleSortChange(value: string) {
    setLoading(true);
    setSortBy(value as AccountsReceivableSortField);
    setPage(1);
  }

  function toggleSortOrder() {
    setLoading(true);
    setSortOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > pages || targetPage === page) {
      return;
    }

    setLoading(true);
    setPage(targetPage);
  }

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <section>
          <p className="text-sm font-semibold text-primary">Finance</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Accounts Receivable
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track outstanding customer balances from sales and service invoices.
          </p>
        </section>

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form
              onSubmit={handleSearch}
              className="flex w-full gap-2 xl:max-w-xl"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, invoice, or notes..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:items-center">
              <SearchableSelect
                value={status}
                onChange={handleStatusChange}
                options={statusOptions}
                placeholder="Filter status"
                searchPlaceholder="Search status..."
                emptyMessage="No status found."
                className="min-w-[190px]"
              />

              <SearchableSelect
                value={sortBy}
                onChange={handleSortChange}
                options={sortOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                emptyMessage="No sort field found."
                className="min-w-[190px]"
              />

              <button
                type="button"
                onClick={toggleSortOrder}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {sortOrder === "desc" ? (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    Descending
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Ascending
                  </>
                )}
              </button>
            </div>
          </div>

          {activeSearch && (
            <div className="mt-3 text-xs text-slate-500">
              Searching for{" "}
              <span className="font-semibold text-slate-700">
                “{activeSearch}”
              </span>
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load accounts receivable
                </p>

                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Receivable Records
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {showingFrom}–{showingTo} of {total} records
                </p>
              </div>

              {loading && (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {loading && records.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading accounts receivable...
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-900">
                No accounts receivable found
              </p>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No receivable records match the current search and filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Invoice
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Original
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Paid
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Balance
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Due Date
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {record.customer.name}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {record.customer.code}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {getInvoiceNumber(record)}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {record.salesInvoice
                              ? formatDate(record.salesInvoice.invoiceDate)
                              : record.serviceInvoice
                                ? formatDate(record.serviceInvoice.invoiceDate)
                                : "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {getInvoiceType(record)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-700">
                          {formatCurrency(record.originalAmount)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-700">
                          {formatCurrency(record.amountPaid)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-950">
                            {formatCurrency(record.balanceDue)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(record.dueDate)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
                              getStatusClass(record.status),
                            ].join(" ")}
                          >
                            {formatStatus(record.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/accounts-receivable/${record.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page {page} of {pages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pages || loading}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
