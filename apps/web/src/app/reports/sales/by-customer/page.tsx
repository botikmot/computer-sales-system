"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileBarChart,
  Loader2,
  Users,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getSalesByCustomer,
  type SalesByCustomerResponse,
} from "@/features/reports/reports-api";

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

export default function SalesByCustomerReportPage() {
  const now = new Date();

  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );

  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const [report, setReport] = useState<SalesByCustomerResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesByCustomer({
          from,
          to,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load sales by customer report.",
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
  }, [from, to]);

  const customers = report?.customers ?? [];

  const totalSales = customers.reduce(
    (sum, item) => sum + Number(item.totalSales),
    0,
  );

  const totalPaid = customers.reduce(
    (sum, item) => sum + Number(item.amountPaid),
    0,
  );

  const totalBalance = customers.reduce(
    (sum, item) => sum + Number(item.balanceDue),
    0,
  );

  const totalInvoices = customers.reduce(
    (sum, item) => sum + item.invoiceCount,
    0,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Link>

            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <FileBarChart className="h-4 w-4" />
              Sales Reports
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Sales by Customer
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Analyze posted sales by customer for the selected period.
            </p>
          </div>

          {/* Date Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
            <div>
              <label
                htmlFor="report-from"
                className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
              >
                From
              </label>

              <input
                id="report-from"
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 h-8 bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              <label
                htmlFor="report-to"
                className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
              >
                To
              </label>

              <input
                id="report-to"
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 h-8 bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Invalid range */}
        {from && to && from > to && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">Invalid reporting period</p>

              <p className="mt-1">
                The From date cannot be later than the To date.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales by customer</p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading sales by customer...
            </div>
          </div>
        )}

        {/* Report */}
        {!loading && report && (
          <>
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Customers"
                value={String(report.count)}
                detail="Customers with posted sales"
                icon={<Users className="h-5 w-5" />}
                iconClass="bg-blue-50 text-blue-600"
              />

              <SummaryCard
                label="Total Sales"
                value={formatCurrency(totalSales)}
                detail={`${totalInvoices} sales invoice${
                  totalInvoices === 1 ? "" : "s"
                }`}
                icon={<FileBarChart className="h-5 w-5" />}
                iconClass="bg-emerald-50 text-emerald-600"
              />

              <SummaryCard
                label="Amount Collected"
                value={formatCurrency(totalPaid)}
                detail="Recorded payments"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconClass="bg-violet-50 text-violet-600"
              />

              <SummaryCard
                label="Balance Due"
                value={formatCurrency(totalBalance)}
                detail="Outstanding customer balances"
                icon={<WalletCards className="h-5 w-5" />}
                iconClass="bg-amber-50 text-amber-600"
              />
            </div>

            {/* Period */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Reporting Period
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-950">
                    {formatDate(report.from)} — {formatDate(report.to)}
                  </h2>
                </div>

                <div className="text-xs text-slate-400">
                  {report.count} customer
                  {report.count === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {/* Customer Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Customer Sales Summary
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Sales totals grouped by customer for the selected period.
                </p>
              </div>

              {customers.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No sales found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    There are no posted sales invoices for the selected period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[820px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Customer
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Invoices
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Total Sales
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Amount Paid
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Balance Due
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {customers.map((item) => (
                        <tr
                          key={item.customer.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.customer.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {item.customer.code}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {item.invoiceCount}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(item.totalSales)}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-600">
                            {formatCurrency(item.amountPaid)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(item.balanceDue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          Total
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {totalInvoices}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-950">
                          {formatCurrency(totalSales)}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {formatCurrency(totalPaid)}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-slate-950">
                          {formatCurrency(totalBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
