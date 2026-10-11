"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import { getSuppliers } from "@/features/purchasing/suppliers-api";

import {
  getAccountsPayablePaymentHistory,
  type AccountsPayablePaymentHistoryResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

function formatCurrency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load supplier payment history.";
}

function getPaymentReference(
  referenceNo: string | null,
  cashBankReference: string | null | undefined,
) {
  return referenceNo || cashBankReference || "—";
}

export default function PaymentHistoryPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] =
    useState<AccountsPayablePaymentHistoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load filter options.
  useEffect(() => {
    let active = true;

    async function loadFilters() {
      try {
        const [branchResult, supplierResult] = await Promise.all([
          getBranches(),

          getSuppliers({
            page: 1,
            limit: 100,
            sortBy: "name",
            sortOrder: "asc",
          }),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchResult.filter((branch) => branch.isActive));

        // Include inactive suppliers because their historical
        // payment records may still need to be reviewed.
        setSuppliers(
          supplierResult.data.map((supplier) => ({
            id: supplier.id,
            code: supplier.code,
            name: supplier.name,
          })),
        );
      } catch {
        // Report data can still be loaded without filter options.
      }
    }

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  // Fetch payment history using server-side pagination.
  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        if (from && to && from > to) {
          throw new Error("The start date must be on or before the end date.");
        }

        const result = await getAccountsPayablePaymentHistory({
          branchId: branchId || undefined,
          supplierId: supplierId || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit,
        });

        if (!active) {
          return;
        }

        setReport(result);
        setError("");
      } catch (requestError: unknown) {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [branchId, supplierId, from, to, page, limit, refreshKey]);

  function changeBranch(value: string) {
    setLoading(true);
    setBranchId(value);
    setPage(1);
  }

  function changeSupplier(value: string) {
    setLoading(true);
    setSupplierId(value);
    setPage(1);
  }

  function changeFrom(value: string) {
    setLoading(true);
    setFrom(value);
    setPage(1);
  }

  function changeTo(value: string) {
    setLoading(true);
    setTo(value);
    setPage(1);
  }

  function changeLimit(value: number) {
    setLoading(true);
    setLimit(value);
    setPage(1);
  }

  function refreshReport() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setLoading(true);
    setBranchId("");
    setSupplierId("");
    setFrom("");
    setTo("");
    setPage(1);
    setRefreshKey((current) => current + 1);
  }

  const payments = report?.payments ?? [];
  const pagination = report?.pagination;

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reports Center
        </Link>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileBarChart className="h-4 w-4" />
              Accounts Payable Reports
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Payment History
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review posted supplier payments, vouchers, references, and cash /
              bank accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="from"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Payment date from
              </label>

              <input
                id="from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => changeFrom(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="to"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Payment date to
              </label>

              <input
                id="to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => changeTo(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="branchFilter"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Branch
              </label>

              <select
                id="branchFilter"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All accessible branches</option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="supplierFilter"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Supplier
              </label>

              <select
                id="supplierFilter"
                value={supplierId}
                onChange={(event) => changeSupplier(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">All suppliers</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} — {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pageSize"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Rows per page
              </label>

              <select
                id="pageSize"
                value={limit}
                onChange={(event) => changeLimit(Number(event.target.value))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Leave the date range blank to view all posted supplier payments
            within the user&apos;s permitted branch scope.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Posted Payments"
            value={formatNumber(report?.count ?? 0)}
            detail="All matching posted supplier payments"
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <SummaryCard
            label="Total Paid"
            value={formatCurrency(report?.total)}
            detail="Total amount across all matching payments"
            icon={<Wallet className="h-5 w-5" />}
          />
        </section>

        {/* Payment table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">
                Supplier Payment Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest posted payments appear first.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {formatNumber(report?.count ?? 0)} payments
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Account / Voucher</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading payment history...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && !error && payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No posted supplier payments found for the selected
                      filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {payment.paymentNo}
                        </p>

                        <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(payment.paymentDate)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {payment.supplier.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {payment.supplier.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {payment.accountsPayable.purchaseInvoice.invoiceNo}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Supplier ref:{" "}
                          {payment.accountsPayable.purchaseInvoice
                            .supplierInvoiceNo || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {payment.account.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {payment.account.accountType}
                          {payment.account.accountNumber
                            ? ` · ${payment.account.accountNumber}`
                            : ""}
                        </p>

                        {payment.paymentVoucher && (
                          <p className="mt-2 text-xs font-medium text-primary">
                            Voucher: {payment.paymentVoucher.voucherNo}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-700">
                          {getPaymentReference(
                            payment.referenceNo,
                            payment.cashBankTransaction?.referenceNo,
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right font-semibold tabular-nums text-slate-950">
                        {formatCurrency(payment.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          {payment.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Server-side pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
              {" · "}
              {formatNumber(pagination?.total ?? report?.count ?? 0)} payments
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPage((current) => Math.max(1, current - 1));
                }}
                disabled={
                  loading || (pagination ? pagination.page <= 1 : page <= 1)
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPage((current) => current + 1);
                }}
                disabled={
                  loading ||
                  (pagination ? pagination.page >= pagination.pages : true)
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <p className="mt-3 break-words text-xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
