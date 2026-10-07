"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  Save,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  createPurchaseInvoice,
  type CreatePurchaseInvoicePayload,
} from "@/features/purchasing/purchase-invoices-api";

import {
  getReceiving,
  type Receiving,
} from "@/features/purchasing/receivings-api";

type PaymentMode = "COD" | "TERMS" | "CASH";

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/* function formatDate(value: string | null | undefined) {
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
} */

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialReceivingId = searchParams.get("receivingId") ?? "";

  const [receiving, setReceiving] = useState<Receiving | null>(null);

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");

  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("TERMS");

  const [dueDate, setDueDate] = useState("");

  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const NO_RECEIVING_MESSAGE =
    "No receiving report was selected. Please create the supplier invoice from a posted and verified receiving.";

  const [loading, setLoading] = useState(() => Boolean(initialReceivingId));
  const [error, setError] = useState<string | null>(() =>
    initialReceivingId ? null : NO_RECEIVING_MESSAGE,
  );

  useEffect(() => {
    if (!initialReceivingId) {
      return;
    }

    let cancelled = false;

    const loadReceiving = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getReceiving(initialReceivingId);

        if (cancelled) return;

        if (data.status !== "POSTED" || data.checkStatus !== "VERIFIED") {
          setError(
            "The selected receiving must be POSTED and VERIFIED before creating a supplier invoice.",
          );
          setReceiving(null);
          return;
        }

        setReceiving(data);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the receiving report.",
        );
        setReceiving(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReceiving();

    return () => {
      cancelled = true;
    };
  }, [initialReceivingId]);

  const invoiceItems = useMemo(() => {
    if (!receiving) {
      return [];
    }

    return receiving.items.filter((item) => item.quantityAccepted > 0);
  }, [receiving]);

  const subtotal = useMemo(() => {
    return invoiceItems.reduce((total, item) => {
      const unitCost = Number(item.purchaseOrderItem?.unitCost ?? 0);

      return total + item.quantityAccepted * unitCost;
    }, 0);
  }, [invoiceItems]);

  const total = subtotal;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receiving) {
      setError("Receiving report is required.");
      return;
    }

    if (paymentMode === "TERMS" && !dueDate) {
      setError("Due date is required for TERMS payment mode.");
      return;
    }

    if (invoiceItems.length === 0) {
      setError(
        "There are no accepted receiving items available for invoicing.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const payload: CreatePurchaseInvoicePayload = {
        receivingId: receiving.id,

        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,

        paymentMode,

        invoiceDate: invoiceDate
          ? new Date(`${invoiceDate}T00:00:00.000Z`).toISOString()
          : undefined,

        dueDate:
          paymentMode === "TERMS" && dueDate
            ? new Date(`${dueDate}T00:00:00.000Z`).toISOString()
            : undefined,

        notes: notes.trim() || undefined,

        items: invoiceItems.map((item) => ({
          receivingItemId: item.id,
        })),
      };

      const created = await createPurchaseInvoice(payload);

      setSuccessMessage(
        `Supplier invoice ${created.invoiceNo} was created and posted successfully.`,
      );

      router.push(`/purchase-invoices/${created.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create supplier invoice.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/purchase-invoices"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Supplier Invoices
            </Link>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                Purchasing
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                New Supplier Invoice
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Create a supplier invoice from a posted and verified receiving
                report.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <section className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading receiving report...
            </div>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to continue
                </p>

                <p className="mt-1 text-sm text-rose-700">{error}</p>

                <Link
                  href="/purchase-invoices"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Supplier Invoices
                </Link>
              </div>
            </div>
          </section>
        ) : receiving ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Truck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Source Receiving
                    </p>

                    <p className="text-xs text-slate-500">
                      This invoice is based on the accepted quantities from the
                      verified receiving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Receiving"
                  value={receiving.receivingNo}
                />

                <InfoCard
                  icon={<FileText className="h-4 w-4" />}
                  label="Purchase Order"
                  value={receiving.purchaseOrder?.poNumber || "—"}
                />

                <InfoCard
                  icon={<Building2 className="h-4 w-4" />}
                  label="Supplier"
                  value={receiving.purchaseOrder?.supplier?.name || "—"}
                />

                <InfoCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Receiving Status"
                  value="POSTED • VERIFIED"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  Invoice Details
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the supplier&apos;s invoice information.
                </p>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Supplier Invoice No.
                  </label>

                  <input
                    value={supplierInvoiceNo}
                    onChange={(event) =>
                      setSupplierInvoiceNo(event.target.value)
                    }
                    placeholder="e.g. SI-2026-00123"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Invoice Date
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(event) => setInvoiceDate(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Payment Mode
                  </label>

                  <select
                    value={paymentMode}
                    onChange={(event) =>
                      setPaymentMode(event.target.value as PaymentMode)
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="TERMS">Terms</option>

                    <option value="COD">COD</option>

                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Due Date
                    {paymentMode === "TERMS" && (
                      <span className="ml-1 text-rose-500">*</span>
                    )}
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      disabled={paymentMode !== "TERMS"}
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 xl:col-span-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Optional notes..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  Accepted Receiving Items
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Quantity and cost are taken from the verified receiving and
                  linked purchase order.
                </p>
              </div>

              {invoiceItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-400">
                  No accepted items available for invoicing.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[820px] w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/70">
                      <tr>
                        <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Product
                        </th>

                        <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          SKU
                        </th>

                        <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Accepted Qty
                        </th>

                        <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Unit Cost
                        </th>

                        <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {invoiceItems.map((item) => {
                        const unitCost = Number(
                          item.purchaseOrderItem?.unitCost ?? 0,
                        );

                        const lineTotal = item.quantityAccepted * unitCost;

                        return (
                          <tr key={item.id}>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {item.product.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {item.product.unit}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm text-slate-600">
                                {item.product.sku}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-bold text-slate-900">
                                {item.quantityAccepted}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-sm text-slate-700">
                                {formatCurrency(unitCost)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-bold text-slate-900">
                                {formatCurrency(lineTotal)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                <div className="flex items-start gap-3">
                  <Receipt className="mt-0.5 h-5 w-5 text-violet-600" />

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Ready to post
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Creating this supplier invoice will immediately post it
                      and create an outstanding balance for Accounts Payable.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <SummaryRow
                    label="Subtotal"
                    value={formatCurrency(subtotal)}
                  />

                  <div className="border-t border-slate-100 pt-3">
                    <SummaryRow
                      label="Total"
                      value={formatCurrency(total)}
                      valueClass="text-lg text-slate-950"
                    />
                  </div>
                </div>
              </div>
            </section>

            {successMessage && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/purchase-invoices"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loading ||
                  !receiving ||
                  invoiceItems.length === 0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting Invoice...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create &amp; Post Supplier Invoice
                  </>
                )}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </AppShell>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          {icon}
        </span>
      </div>

      <p className="mt-3 truncate text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-slate-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>

      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
