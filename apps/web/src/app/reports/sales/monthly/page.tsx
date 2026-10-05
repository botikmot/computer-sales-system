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
  Receipt,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getMonthlySales,
  type MonthlySalesResponse,
} from "@/features/reports/reports-api";

type MonthlySalesInvoice = {
  id: string;
  invoiceNo: string;
  customerId: string;
  status: string;
  paymentMode: "CASH" | "CREDIT";
  invoiceDate: string;
  dueDate?: string | null;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  customer: {
    id: string;
    code: string;
    name: string;
  };
  createdBy?: {
    id: string;
    username: string;
    email?: string | null;
    fullName?: string | null;
    role: string;
    status: string;
    branchId?: string | null;
  } | null;
};

type MonthlySalesReport = Omit<MonthlySalesResponse, "invoices"> & {
  invoices: MonthlySalesInvoice[];
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
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

function formatDateTime(value: string | null | undefined) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getPaymentClass(paymentMode: string) {
  return paymentMode === "CASH"
    ? "bg-blue-50 text-blue-700"
    : "bg-amber-50 text-amber-700";
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

function getMonthLabel(month: number) {
  return MONTHS.find((item) => item.value === month)?.label ?? "Unknown";
}

export default function MonthlySalesReportPage() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [report, setReport] = useState<MonthlySalesReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getMonthlySales({
          year,
          month,
        });

        if (cancelled) {
          return;
        }

        setReport(result as MonthlySalesReport);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load monthly sales report.",
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
  }, [year, month]);

  const invoices = report?.invoices ?? [];

  const yearOptions = Array.from({ length: 7 }, (_, index) => {
    return now.getFullYear() - index;
  });

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
              Monthly Sales
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review sales performance and posted invoices for a selected month.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-4 w-4" />
              </div>

              <div>
                <label
                  htmlFor="report-year"
                  className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  Year
                </label>

                <select
                  id="report-year"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="mt-0.5 h-8 bg-transparent text-sm font-semibold text-slate-900 outline-none"
                >
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 sm:border-l sm:border-t-0 sm:pl-3">
              <label
                htmlFor="report-month"
                className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
              >
                Month
              </label>

              <select
                id="report-month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="mt-0.5 h-8 bg-transparent text-sm font-semibold text-slate-900 outline-none"
              >
                {MONTHS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load monthly sales report
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading monthly sales report...
            </div>
          </div>
        )}

        {/* Report */}
        {!loading && report && (
          <>
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Sales Invoices"
                value={String(report.count)}
                detail={`${getMonthLabel(report.month)} ${report.year}`}
                icon={<Receipt className="h-5 w-5" />}
                iconClass="bg-blue-50 text-blue-600"
              />

              <SummaryCard
                label="Total Sales"
                value={formatCurrency(report.totalSales)}
                detail="Posted invoices"
                icon={<FileBarChart className="h-5 w-5" />}
                iconClass="bg-emerald-50 text-emerald-600"
              />

              <SummaryCard
                label="Amount Collected"
                value={formatCurrency(report.amountPaid)}
                detail="Recorded payments"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconClass="bg-violet-50 text-violet-600"
              />

              <SummaryCard
                label="Balance Due"
                value={formatCurrency(report.balanceDue)}
                detail="Remaining receivables"
                icon={<CalendarDays className="h-5 w-5" />}
                iconClass="bg-amber-50 text-amber-600"
              />
            </div>

            {/* Period */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Reporting Period
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-950">
                    {getMonthLabel(report.month)} {report.year}
                  </h2>
                </div>

                <div className="text-xs text-slate-500">
                  {formatDate(report.from)} — {formatDate(report.to)}
                </div>
              </div>
            </div>

            {/* Invoice table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Monthly Sales Transactions
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Posted sales invoices recorded during the selected month.
                </p>
              </div>

              {invoices.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No sales recorded
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    There are no posted sales invoices for this month.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Invoice
                        </th>

                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Customer
                        </th>

                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Date
                        </th>

                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Payment
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Total
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Paid
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Balance
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {invoice.invoiceNo}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {invoice.customer.code}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">
                              {invoice.customer.name}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {formatDateTime(invoice.invoiceDate)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getPaymentClass(
                                invoice.paymentMode,
                              )}`}
                            >
                              {invoice.paymentMode}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(invoice.total)}
                          </td>

                          <td className="px-5 py-4 text-right text-slate-600">
                            {formatCurrency(invoice.amountPaid)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(invoice.balanceDue)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                                invoice.status,
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
