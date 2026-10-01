"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CreditCard, Eye, Loader2, Receipt } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getCustomerPayments,
  type CustomerPayment,
} from "@/features/sales/sales-api";

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

    case "VOID":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      try {
        setLoading(true);
        setError("");

        const result = await getCustomerPayments();

        if (!cancelled) {
          setPayments(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load customer payments.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <section>
          <p className="text-sm font-semibold text-primary">Sales</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Customer Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track customer collections and their cash or bank entries.
          </p>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load customer payments</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* LIST */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Payment Records</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Latest customer payments recorded in the system
            </p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Receipt className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No customer payments yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Customer payments will appear here after a collection is
                recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Account
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
                  {payments.map((payment) => {
                    const invoice =
                      payment.salesInvoice ?? payment.serviceInvoice;

                    return (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-sm font-semibold text-slate-900">
                            {payment.paymentNo}
                          </p>

                          {payment.referenceNo && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Ref: {payment.referenceNo}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {payment.customer.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {payment.customer.code}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {invoice ? (
                            <p className="font-mono text-xs font-semibold text-slate-600">
                              {invoice.invoiceNo}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(payment.paymentDate)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {payment.account.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {payment.account.accountType}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                              payment.status,
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/sales/payments/${payment.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
