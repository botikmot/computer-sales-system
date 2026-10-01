"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  RotateCcw,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSalesReturn, type SalesReturn } from "@/features/sales/sales-api";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

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
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    case "DRAFT":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getSettlementClass(mode: string) {
  switch (mode) {
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

export default function SalesReturnDetailPage() {
  const params = useParams();

  const id = typeof params.id === "string" ? params.id : "";

  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadReturn() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesReturn(id);

        if (!cancelled) {
          setSalesReturn(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load sales return.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReturn();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sales return...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!salesReturn) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/returns"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Returns
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales return</p>

              <p className="mt-1">{error || "Sales return was not found."}</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/sales/returns"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Returns
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {salesReturn.returnNo}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  salesReturn.status,
                )}`}
              >
                {salesReturn.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Sales return, settlement, and inventory return details.
            </p>
          </div>

          <Link
            href={`/sales/invoices/${salesReturn.salesInvoiceId}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
          >
            <Receipt className="h-4 w-4" />
            View Source Invoice
          </Link>
        </section>

        {/* POSTED */}
        {salesReturn.status === "POSTED" && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Sales Return Posted
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  The returned items and selected settlement have been recorded
                  successfully.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CUSTOMER + RETURN DETAILS */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Customer</h2>
            </div>

            <div className="mt-5">
              <p className="text-base font-semibold text-slate-900">
                {salesReturn.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {salesReturn.customer.code}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Branch
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {salesReturn.branch.name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Return Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(salesReturn.returnDate)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Settlement</h2>
            </div>

            <div className="mt-5">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getSettlementClass(
                  salesReturn.settlementMode,
                )}`}
              >
                {formatSettlementMode(salesReturn.settlementMode)}
              </span>

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Return Total
                </p>

                <p className="mt-1 font-mono text-2xl font-bold text-slate-950">
                  {formatCurrency(salesReturn.total)}
                </p>
              </div>

              {salesReturn.refundAccount && (
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Refund Account
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {salesReturn.refundAccount.name}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {salesReturn.refundAccount.accountType}
                    {salesReturn.refundAccount.accountNumber
                      ? ` • ${salesReturn.refundAccount.accountNumber}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SOURCE INVOICE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">Source Invoice</h2>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Invoice No.
              </p>

              <Link
                href={`/sales/invoices/${salesReturn.salesInvoiceId}`}
                className="mt-1 inline-flex font-mono text-sm font-semibold text-primary hover:underline"
              >
                {salesReturn.salesInvoice.invoiceNo}
              </Link>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Invoice Date
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(salesReturn.salesInvoice.invoiceDate)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Payment Mode
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {salesReturn.salesInvoice.paymentMode}
              </p>
            </div>
          </div>
        </section>

        {/* RETURN ITEMS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Returned Items</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Products returned from the source sales invoice.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Return Qty
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Unit Price
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {salesReturn.items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.product.name}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {item.product.sku}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm font-bold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CASH / BANK TRANSACTION */}
        {salesReturn.cashBankTransaction && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Cash / Bank Transaction
              </h2>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Transaction Type
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {salesReturn.cashBankTransaction.transactionType}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Direction
                </p>

                <p className="mt-1 text-sm font-semibold text-rose-600">
                  {salesReturn.cashBankTransaction.direction}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Amount
                </p>

                <p className="mt-1 font-mono text-base font-bold text-slate-950">
                  {formatCurrency(salesReturn.cashBankTransaction.amount)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Transaction Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(salesReturn.cashBankTransaction.transactionDate)}
                </p>
              </div>
            </div>

            {salesReturn.cashBankTransaction.referenceNo && (
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Reference No.
                </p>

                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {salesReturn.cashBankTransaction.referenceNo}
                </p>
              </div>
            )}

            {salesReturn.cashBankTransaction.notes && (
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Transaction Notes
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {salesReturn.cashBankTransaction.notes}
                </p>
              </div>
            )}
          </section>
        )}

        {/* REASON + NOTES */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Return Reason</h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {salesReturn.reason || "No return reason was provided."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Notes</h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {salesReturn.notes || "No notes were added to this return."}
            </p>
          </section>
        </div>

        {/* META */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">Record Information</h2>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Return No.
              </p>

              <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                {salesReturn.returnNo}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Branch
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {salesReturn.branch.name}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Status
              </p>

              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                  salesReturn.status,
                )}`}
              >
                {salesReturn.status}
              </span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
