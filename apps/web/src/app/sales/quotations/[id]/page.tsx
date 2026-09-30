"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  acceptSalesQuotation,
  createSalesOrderFromQuotation,
  getSalesQuotation,
  sendSalesQuotation,
  type SalesQuotation,
} from "@/features/sales/sales-api";

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

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "SENT":
      return "bg-blue-50 text-blue-700";

    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700";

    case "CONVERTED":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStepClass(
  status: string,
  step: "DRAFT" | "SENT" | "ACCEPTED" | "CONVERTED",
) {
  const steps = ["DRAFT", "SENT", "ACCEPTED", "CONVERTED"];

  const currentIndex = steps.indexOf(status);
  const stepIndex = steps.indexOf(step);

  return stepIndex <= currentIndex
    ? "bg-primary text-white"
    : "bg-slate-100 text-slate-400";
}

export default function QuotationDetailPage() {
  const params = useParams();

  const id = typeof params.id === "string" ? params.id : "";

  const [quotation, setQuotation] = useState<SalesQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadQuotation() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesQuotation(id);

        if (!cancelled) {
          setQuotation(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load quotation.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuotation();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSend() {
    if (!quotation) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const updated = await sendSalesQuotation(quotation.id);

      setQuotation((current) =>
        current ? { ...current, status: updated.status } : current,
      );
      setSuccess("Quotation sent successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send quotation.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleAccept() {
    if (!quotation) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const updated = await acceptSalesQuotation(quotation.id);

      setQuotation((current) =>
        current ? { ...current, status: updated.status } : current,
      );
      setSuccess("Quotation accepted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to accept quotation.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleCreateSalesOrder() {
    if (!quotation) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const result = await createSalesOrderFromQuotation(quotation.id);

      setQuotation((current) =>
        current
          ? {
              ...current,
              status: "CONVERTED",
            }
          : current,
      );

      setSuccess(`Sales order ${result.orderNo} was created successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create sales order.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading quotation...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !quotation) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Link
            href="/sales/quotations"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quotations
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!quotation) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            Quotation not found
          </p>

          <Link
            href="/sales/quotations"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quotations
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/sales/quotations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotations
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {quotation.quotationNo}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  quotation.status,
                )}`}
              >
                {quotation.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Customer quotation details and approval workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quotation.status === "DRAFT" && (
              <button
                type="button"
                onClick={handleSend}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Quotation
              </button>
            )}

            {quotation.status === "SENT" && (
              <button
                type="button"
                onClick={handleAccept}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Accept Quotation
              </button>
            )}

            {quotation.status === "ACCEPTED" && (
              <button
                type="button"
                onClick={handleCreateSalesOrder}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}

                {processing ? "Creating Sales Order..." : "Create Sales Order"}
              </button>
            )}
          </div>
        </section>

        {/* SUCCESS */}
        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">{success}</p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && quotation && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* STATUS FLOW */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Quotation Status</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Current position in the quotation workflow
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              ["DRAFT", "Draft"],
              ["SENT", "Sent"],
              ["ACCEPTED", "Accepted"],
              ["CONVERTED", "Converted"],
            ].map(([value, label]) => (
              <div key={value} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${getStepClass(
                    quotation.status,
                    value as "DRAFT" | "SENT" | "ACCEPTED" | "CONVERTED",
                  )}`}
                >
                  {["DRAFT", "SENT", "ACCEPTED", "CONVERTED"].indexOf(value) +
                    1}
                </div>

                <span className="text-[11px] font-semibold text-slate-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CUSTOMER + DETAILS */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Customer</h2>
            </div>

            <div className="mt-5">
              <p className="text-base font-semibold text-slate-900">
                {quotation.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {quotation.customer.code}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Quotation Details
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Quotation Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(quotation.quotationDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Valid Until
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(quotation.validUntil)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Source Inquiry
                </p>

                {quotation.inquiry ? (
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                    {quotation.inquiry.inquiryNo}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">—</p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Branch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {quotation.branch?.name ?? "—"}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ITEMS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Quotation Items</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Products and pricing included in this quotation
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
                    Qty
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
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
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

        {/* NOTES + SUMMARY */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Notes</h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {quotation.notes || "No notes were added to this quotation."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Summary</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.tax)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="font-mono text-xl font-bold text-slate-950">
                    {formatCurrency(quotation.total)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
