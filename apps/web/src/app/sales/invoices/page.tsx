"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Receipt,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSalesInvoices,
  type SalesInvoice,
} from "@/features/sales/sales-api";

function getStoredUserRole() {
  if (typeof window === "undefined") return "";

  try {
    const rawUser = window.localStorage.getItem("compflow_user");

    if (!rawUser) return "";

    const parsed = JSON.parse(rawUser);

    if (typeof parsed?.role === "string") {
      return parsed.role;
    }

    if (typeof parsed?.user?.role === "string") {
      return parsed.user.role;
    }

    return "";
  } catch {
    return "";
  }
}

function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("compflow-auth-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("compflow-auth-change", callback);
  };
}

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

    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getPaymentClass(paymentMode: string) {
  return paymentMode === "CASH"
    ? "bg-blue-50 text-blue-700"
    : "bg-amber-50 text-amber-700";
}

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userRole = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredUserRole,
    () => "",
  );

  const canRecordPayment =
    userRole === "ADMIN" || userRole === "MANAGER" || userRole === "CASHIER";

  useEffect(() => {
    let cancelled = false;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesInvoices();

        if (!cancelled) {
          setInvoices(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales invoices.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoices();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        <section>
          <p className="text-sm font-semibold text-primary">Sales</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Sales Invoices
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View posted sales invoices and outstanding customer balances.
          </p>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales invoices</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Invoice Records</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Posted sales invoices from delivered sales orders
            </p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No sales invoices yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Invoices created from delivered sales orders will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Sales Order
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Balance
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
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {invoice.invoiceNo}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {invoice.customer.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {invoice.customer.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {invoice.salesOrder ? (
                          <p className="font-mono text-xs font-semibold text-slate-600">
                            {invoice.salesOrder.orderNo}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(invoice.invoiceDate)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getPaymentClass(
                            invoice.paymentMode,
                          )}`}
                        >
                          {invoice.paymentMode}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {formatCurrency(invoice.total)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            Number(invoice.balanceDue) > 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(invoice.balanceDue)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                            invoice.status,
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/sales/invoices/${invoice.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>

                          {canRecordPayment &&
                            Number(invoice.balanceDue) > 0 && (
                              <Link
                                href={`/sales/invoices/${invoice.id}?payment=1`}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:opacity-90"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Record Payment
                              </Link>
                            )}
                        </div>
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
