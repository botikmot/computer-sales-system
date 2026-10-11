"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches } from "@/features/branches/branches-api";
import {
  getAccountsReceivableOutstanding,
  type AccountsReceivableOutstandingResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

type BranchOption = Awaited<ReturnType<typeof getBranches>>[number];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load outstanding receivables. Please try again.";
}

export default function OutstandingReceivablesPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] =
    useState<AccountsReceivableOutstandingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getBranches()
      .then((result) => {
        if (active) setBranches(result);
      })
      .catch(() => {
        if (active) setBranches([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getAccountsReceivableOutstanding({
      ...(branchId ? { branchId } : {}),
      page,
      limit,
    })
      .then((result) => {
        if (!active) return;

        setData(result);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [branchId, page, limit, reloadKey]);

  const totalPages = Math.max(1, data?.pagination.pages ?? 1);
  const totalRecords = data?.count ?? 0;
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  function changeBranch(value: string) {
    setLoading(true);
    setError("");
    setBranchId(value);
    setPage(1);
  }

  function changePageSize(value: string) {
    setLoading(true);
    setError("");
    setLimit(Number(value));
    setPage(1);
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;

    setLoading(true);
    setError("");
    setPage(nextPage);
  }

  return (
    <AppShell>
      <main className="space-y-6 px-4 py-6 md:px-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reports Center
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <FileBarChart className="h-4 w-4" />
              Reports / Accounts Receivable
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Outstanding Receivables
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review unpaid and partially paid customer invoices and their
              remaining balances.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Outstanding Invoices
              </p>
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {loading && !data ? "—" : totalRecords.toLocaleString("en-PH")}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Unpaid or partially paid invoices
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Balance Due
              </p>
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>

            <p className="mt-3 break-words text-2xl font-bold text-slate-900">
              {loading && !data ? "—" : formatCurrency(data?.total)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total across all matching invoices
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[minmax(220px,320px)_1fr] sm:items-end">
            <div>
              <label
                htmlFor="branch-filter"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>

              <select
                id="branch-filter"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All accessible branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code ? `${branch.code} — ` : ""}
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-slate-500 sm:text-right">
              Ordered by due date, then creation date
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Outstanding Invoice List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading report records..."
                  : `Showing ${startRecord}–${endRecord} of ${totalRecords} invoices`}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Rows per page
              <select
                value={limit}
                onChange={(event) => changePageSize(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice No.</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Due Date</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Original Amount
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Amount Paid
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Balance Due
                  </th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading outstanding receivables...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 font-medium text-slate-700">
                        No outstanding receivables found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another branch or check again after recording an
                        invoice with an outstanding balance.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  data?.records.map((record) => {
                    const invoiceNo =
                      record.salesInvoice?.invoiceNo ??
                      record.serviceInvoice?.invoiceNo ??
                      "—";

                    const invoiceType = record.salesInvoice
                      ? "Sales"
                      : record.serviceInvoice
                        ? "Service"
                        : "—";

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {invoiceNo}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {invoiceType}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {record.customer.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {record.customer.code}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(record.dueDate)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                          {formatCurrency(record.originalAmount)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                          {formatCurrency(record.amountPaid)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                          {formatCurrency(record.balanceDue)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                              record.status === "PARTIALLY_PAID"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {record.status === "PARTIALLY_PAID"
                              ? "Partially Paid"
                              : record.status.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={loading || page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={loading || page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
