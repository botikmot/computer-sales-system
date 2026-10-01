"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSalesReturns, type SalesReturn } from "@/features/sales/sales-api";

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

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getSettlementClass(settlementMode: string) {
  switch (settlementMode) {
    case "CASH_REFUND":
      return "bg-blue-50 text-blue-700";

    case "AR_ADJUSTMENT":
      return "bg-amber-50 text-amber-700";

    case "NO_REFUND":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatSettlementMode(mode: string) {
  switch (mode) {
    case "CASH_REFUND":
      return "Cash Refund";

    case "AR_ADJUSTMENT":
      return "AR Adjustment";

    case "NO_REFUND":
      return "No Refund";

    default:
      return mode;
  }
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

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReturns() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesReturns();

        if (!cancelled) {
          setReturns(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales returns.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReturns();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Sales Returns
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track returned sales items, settlements, and refunds.
            </p>
          </div>

          <Link
            href="/sales/returns/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Sales Return
          </Link>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales returns</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Return Records</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Posted sales returns and their settlement details
            </p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No sales returns yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Customer returns will appear here after they are posted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Return
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Settlement
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Total
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
                  {returns.map((salesReturn) => (
                    <tr
                      key={salesReturn.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {salesReturn.returnNo}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/sales/invoices/${salesReturn.salesInvoiceId}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {salesReturn.salesInvoice.invoiceNo}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {salesReturn.customer.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {salesReturn.customer.code}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(salesReturn.returnDate)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getSettlementClass(
                            salesReturn.settlementMode,
                          )}`}
                        >
                          {formatSettlementMode(salesReturn.settlementMode)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {formatCurrency(salesReturn.total)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                            salesReturn.status,
                          )}`}
                        >
                          {salesReturn.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/sales/returns/${salesReturn.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
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
          )}
        </section>
      </div>
    </AppShell>
  );
}
