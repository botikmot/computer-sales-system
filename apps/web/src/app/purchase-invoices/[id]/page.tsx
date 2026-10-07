"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Receipt,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getPurchaseInvoice,
  type PurchaseInvoice,
} from "@/features/purchasing/purchase-invoices-api";

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
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

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";

    case "PARTIALLY_PAID":
      return "border-amber-100 bg-amber-50 text-amber-700";

    case "PAID":
      return "border-blue-100 bg-blue-50 text-blue-700";

    case "CANCELLED":
      return "border-rose-100 bg-rose-50 text-rose-700";

    case "DRAFT":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getPaymentModeLabel(paymentMode: string) {
  switch (paymentMode) {
    case "TERMS":
      return "Terms";

    case "COD":
      return "Cash on Delivery";

    case "CASH":
      return "Cash";

    default:
      return paymentMode;
  }
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <div className="mt-1 break-words text-sm font-semibold text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        setError("");

        const result = await getPurchaseInvoice(id);

        if (cancelled) {
          return;
        }

        setInvoice(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load supplier invoice.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading supplier invoice...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !invoice) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Link
            href="/purchase-invoices"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Supplier Invoices
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load supplier invoice</p>

              <p className="mt-1">
                {error || "Supplier invoice was not found."}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const status = invoice.status;

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/purchase-invoices"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supplier Invoices
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {invoice.invoiceNo}
              </h1>

              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                  getStatusClass(status),
                ].join(" ")}
              >
                {status}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Supplier invoice generated from a verified and posted receiving
              report.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Posted
            </span>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            icon={<Receipt className="h-4 w-4" />}
            label="Supplier Invoice No."
            value={invoice.supplierInvoiceNo || "—"}
          />

          <InfoCard
            icon={<Truck className="h-4 w-4" />}
            label="Receiving"
            value={invoice.receiving?.receivingNo || "—"}
          />

          <InfoCard
            icon={<FileText className="h-4 w-4" />}
            label="Purchase Order"
            value={invoice.purchaseOrder?.poNumber || "—"}
          />

          <InfoCard
            icon={<Building2 className="h-4 w-4" />}
            label="Supplier"
            value={invoice.supplier?.name || "—"}
          />
        </section>

        {/* DOCUMENT DETAILS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Invoice Details
                </p>

                <p className="text-xs text-slate-400">
                  Supplier invoice and payment information
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Invoice Date"
              value={formatDate(invoice.invoiceDate)}
            />

            <InfoCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Due Date"
              value={formatDate(invoice.dueDate)}
            />

            <InfoCard
              icon={<Receipt className="h-4 w-4" />}
              label="Payment Mode"
              value={getPaymentModeLabel(invoice.paymentMode)}
            />

            <InfoCard
              icon={<Building2 className="h-4 w-4" />}
              label="Branch"
              value={invoice.branch?.name || "—"}
            />
          </div>
        </section>

        {/* ITEMS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Invoice Items
                </p>

                <p className="text-xs text-slate-400">
                  Items accepted from the verified receiving
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/40">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Unit Cost</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.product?.name || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {item.product?.sku || "—"}
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-slate-700">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-700">
                      {formatMoney(item.unitCost)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatMoney(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5">
            <div className="ml-auto max-w-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(invoice.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(invoice.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(invoice.tax)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="text-xl font-bold text-slate-950">
                    {formatMoney(invoice.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PAYMENT STATUS */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Amount Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatMoney(invoice.amountPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Balance Due
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-800">
              {formatMoney(invoice.balanceDue)}
            </p>
          </div>
        </section>

        {/* NOTES / AUDIT */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Notes</p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {invoice.notes || "No notes added."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">
              Record Information
            </p>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Invoice No.</span>
                <span className="font-medium text-slate-700">
                  {invoice.invoiceNo}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Status</span>
                <span className="font-medium text-slate-700">
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
