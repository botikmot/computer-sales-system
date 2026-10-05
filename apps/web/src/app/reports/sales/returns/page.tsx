"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSalesReturns } from "@/features/reports/reports-api";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function formatDateInput(value: string) {
  return value;
}

function getDefaultFrom() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getDefaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function getSettlementLabel(mode: string) {
  switch (mode) {
    case "CASH_REFUND":
      return "Cash Refund";

    case "AR_ADJUSTMENT":
      return "A/R Adjustment";

    case "NO_REFUND":
      return "No Refund";

    default:
      return mode;
  }
}

function getSettlementClass(mode: string) {
  switch (mode) {
    case "CASH_REFUND":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";

    case "AR_ADJUSTMENT":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";

    case "NO_REFUND":
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

    case "DRAFT":
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";

    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20";
  }
}

export default function SalesReturnsReportPage() {
  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);

  const [appliedFrom, setAppliedFrom] = useState(getDefaultFrom);
  const [appliedTo, setAppliedTo] = useState(getDefaultTo);

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getSalesReturns>
  > | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesReturns({
          from: appliedFrom,
          to: appliedTo,
        });

        if (cancelled) {
          return;
        }

        setData(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sales returns report.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [appliedFrom, appliedTo]);

  const summary = useMemo(() => {
    return {
      returns: data?.count ?? 0,
      totalReturns: Number(data?.totalReturns ?? 0),
      cashRefund: Number(data?.bySettlementMode.cashRefund ?? 0),
      arAdjustment: Number(data?.bySettlementMode.arAdjustment ?? 0),
      noRefund: Number(data?.bySettlementMode.noRefund ?? 0),
    };
  }, [data]);

  function handleApply() {
    if (!from || !to) {
      return;
    }

    if (from > to) {
      setError("The From date cannot be later than the To date.");
      return;
    }

    setAppliedFrom(formatDateInput(from));
    setAppliedTo(formatDateInput(to));
  }

  function handleReset() {
    const defaultFrom = getDefaultFrom();
    const defaultTo = getDefaultTo();

    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
    setError("");
  }

  return (
    <AppShell>
      <main className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/reports"
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-slate-700" />

                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Sales Returns
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Posted sales returns and refund adjustments for the selected
                period.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-900">
              Reporting Period
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label
                htmlFor="sales-return-from"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                From
              </label>

              <input
                id="sales-return-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="sales-return-to"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                To
              </label>

              <input
                id="sales-return-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleApply}
                disabled={!from || !to || loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                <BarChart3 className="h-4 w-4" />
                Apply
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Returns</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : summary.returns}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Returns</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : formatCurrency(summary.totalReturns)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Cash Refund</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : formatCurrency(summary.cashRefund)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">A/R Adjustment</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : formatCurrency(summary.arAdjustment)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">No Refund</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : formatCurrency(summary.noRefund)}
            </p>
          </div>
        </section>

        {/* Period */}
        <div className="text-sm text-slate-500">
          Period:{" "}
          <span className="font-medium text-slate-700">
            {formatDate(appliedFrom)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700">
            {formatDate(appliedTo)}
          </span>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Return Transactions
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Return #
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Customer
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Invoice
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Settlement
                  </th>

                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Total
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading sales returns...
                    </td>
                  </tr>
                ) : data?.returns.length ? (
                  data.returns.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {row.returnNo}
                        </div>

                        {row.reason && (
                          <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                            {row.reason}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatDate(row.returnDate)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {row.customer.name}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {row.customer.code}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {row.salesInvoice.invoiceNo}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {formatDate(row.salesInvoice.invoiceDate)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSettlementClass(
                            row.settlementMode,
                          )}`}
                        >
                          {getSettlementLabel(row.settlementMode)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(row.total)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            row.status,
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No sales returns found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>

              {!loading && data?.returns.length ? (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 font-semibold text-slate-900"
                    >
                      Total
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(summary.totalReturns)}
                    </td>

                    <td className="px-4 py-4 text-slate-500">
                      {summary.returns} return
                      {summary.returns === 1 ? "" : "s"}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
