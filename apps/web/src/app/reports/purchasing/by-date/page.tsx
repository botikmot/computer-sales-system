"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getPurchasesByDate,
  type PurchasesByDateResponse,
} from "@/features/reports/reports-api";

function getInitialFromDate() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getInitialToDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
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

function SummaryCard({
  label,
  value,
  icon,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
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

export default function PurchasesByDatePage() {
  const [fromDate, setFromDate] = useState(getInitialFromDate);
  const [toDate, setToDate] = useState(getInitialToDate);

  const [activeFromDate, setActiveFromDate] = useState(getInitialFromDate);
  const [activeToDate, setActiveToDate] = useState(getInitialToDate);

  const [report, setReport] = useState<PurchasesByDateResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const result = await getPurchasesByDate({
          from: activeFromDate,
          to: activeToDate,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setReport(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchases by date report.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeFromDate, activeToDate]);

  function handleApplyFilters() {
    if (!fromDate || !toDate) {
      setError("Please select both From and To dates.");
      return;
    }

    if (fromDate > toDate) {
      setError("From date cannot be later than To date.");
      return;
    }

    setActiveFromDate(fromDate);
    setActiveToDate(toDate);
  }

  const dates = report?.dates ?? [];

  const invoiceCount = dates.reduce((sum, item) => sum + item.invoiceCount, 0);

  const totalPurchases = dates.reduce(
    (sum, item) => sum + Number(item.total),
    0,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              Purchasing Reports
            </span>

            <span className="text-slate-300">/</span>

            <span className="text-sm text-slate-500">Purchases by Date</span>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Purchases by Date
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review posted supplier purchases grouped by purchase invoice date.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="fromDate"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  From
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="toDate"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  To
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Report period:</span>

            <span>{formatDate(report?.from ?? activeFromDate)}</span>

            <span className="text-slate-300">to</span>

            <span>{formatDate(report?.to ?? activeToDate)}</span>
          </div>
        </section>

        {/* ERROR */}
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Days with Purchases"
            value={report?.count ?? 0}
            icon={<CalendarDays className="h-4 w-4" />}
          />

          <SummaryCard
            label="Purchase Invoices"
            value={invoiceCount}
            icon={<FileText className="h-4 w-4" />}
          />

          <SummaryCard
            label="Grand Total"
            value={formatCurrency(report?.grandTotal ?? 0)}
            icon={<span className="text-sm font-bold">₱</span>}
            valueClassName="text-primary"
          />
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Daily Purchase Summary
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Posted supplier purchases grouped by invoice date.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading purchase report...
              </div>
            </div>
          ) : dates.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarDays className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No purchases found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                There are no posted supplier invoices within the selected date
                range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader align="right">Purchase Invoices</TableHeader>
                    <TableHeader align="right">Total</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {dates.map((item) => (
                    <tr
                      key={item.date}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
                        {formatDate(item.date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                        {item.invoiceCount}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t border-slate-200 bg-slate-50/70">
                  <tr>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      Total
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {invoiceCount}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-primary">
                      {formatCurrency(report?.grandTotal ?? totalPurchases)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
