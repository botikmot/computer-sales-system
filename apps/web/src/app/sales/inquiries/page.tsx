"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSalesInquiries,
  type SalesInquiry,
} from "@/features/sales/sales-api";

const PAGE_SIZE = 10;

type SortField = "inquiryNo" | "inquiryDate" | "status" | "createdAt";

function formatDate(value: string) {
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
    case "OPEN":
      return "bg-blue-50 text-blue-700";

    case "QUOTED":
      return "bg-amber-50 text-amber-700";

    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<SalesInquiry[]>([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInquiries() {
      try {
        setError("");

        const result = await getSalesInquiries({
          page,
          limit: PAGE_SIZE,
          search: activeSearch || undefined,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setInquiries(result.items);
        setPages(result.pagination.pages);
        setTotal(result.pagination.total);

        // Keep the server-confirmed page in sync without
        // changing it unnecessarily.
        if (result.pagination.page !== page) {
          setPage(result.pagination.page);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load inquiries.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInquiries();

    return () => {
      cancelled = true;
    };
  }, [page, activeSearch, sortBy, sortOrder]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = search.trim();

    setLoading(true);
    setActiveSearch(value);
    setPage(1);
  }

  function handleSortBy(value: SortField) {
    setLoading(true);
    setSortBy(value);
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
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Customer Inquiries
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Capture customer requests before preparing a quotation.
            </p>
          </div>

          <Link
            href="/sales/inquiries/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            New Inquiry
          </Link>
        </section>

        {/* SEARCH + SORT */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSearch}
              className="flex w-full gap-2 lg:max-w-xl"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search inquiry, customer, product..."
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) =>
                    handleSortBy(event.target.value as SortField)
                  }
                  className="h-11 min-w-[170px] appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                >
                  <option value="createdAt">Created Date</option>

                  <option value="inquiryDate">Inquiry Date</option>

                  <option value="inquiryNo">Inquiry No.</option>

                  <option value="status">Status</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                type="button"
                onClick={toggleSortOrder}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {sortOrder === "desc" ? "Descending" : "Ascending"}
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
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load inquiries</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Inquiry Records
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Latest customer inquiries
                </p>
              </div>

              {!loading && total > 0 && (
                <p className="text-xs font-medium text-slate-400">
                  Showing {showingFrom}–{showingTo} of {total}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                {activeSearch ? "No matching inquiries" : "No inquiries yet"}
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                {activeSearch
                  ? "Try a different search term."
                  : "Start by recording your first customer inquiry."}
              </p>

              {!activeSearch && (
                <Link
                  href="/sales/inquiries/new"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create First Inquiry
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Inquiry
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Items
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Date
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
                    {inquiries.map((inquiry) => (
                      <tr
                        key={inquiry.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-sm font-semibold text-slate-900">
                            {inquiry.inquiryNo}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {inquiry.customer.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {inquiry.customer.code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[260px] flex-wrap gap-1.5">
                            {inquiry.items.slice(0, 2).map((item) => (
                              <span
                                key={item.id}
                                className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                              >
                                {item.quantity} × {item.product.name}
                              </span>
                            ))}

                            {inquiry.items.length > 2 && (
                              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-primary">
                                +{inquiry.items.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(inquiry.inquiryDate)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                              inquiry.status,
                            )}`}
                          >
                            {inquiry.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {inquiry.status === "OPEN" ? (
                            <Link
                              href={`/sales/quotations/new?inquiryId=${inquiry.id}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-primary transition hover:bg-blue-100"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Create Quotation
                            </Link>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              {inquiry.status === "QUOTED"
                                ? "Quoted"
                                : inquiry.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-400">
                  Page {page} of {Math.max(pages, 1)}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => goToPage(page - 1)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  {Array.from(
                    {
                      length: Math.min(pages, 5),
                    },
                    (_, index) => {
                      let targetPage = index + 1;

                      if (pages > 5) {
                        const start = Math.min(
                          Math.max(page - 2, 1),
                          pages - 4,
                        );

                        targetPage = start + index;
                      }

                      return (
                        <button
                          key={targetPage}
                          type="button"
                          onClick={() => goToPage(targetPage)}
                          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
                            targetPage === page
                              ? "bg-primary text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {targetPage}
                        </button>
                      );
                    },
                  )}

                  <button
                    type="button"
                    disabled={page >= pages || loading || pages === 0}
                    onClick={() => goToPage(page + 1)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
