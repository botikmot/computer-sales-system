"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getSupplierQuotation,
  type SupplierQuotation,
} from "@/features/purchasing/supplier-quotations-api";

import { createPurchaseOrder } from "@/features/purchasing/purchase-orders-api";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
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

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>

          {description ? (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supplierQuotationId =
    searchParams.get("supplierQuotationId")?.trim() || "";

  const [quotation, setQuotation] = useState<SupplierQuotation | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadQuotation() {
      if (!supplierQuotationId) {
        setError("Supplier quotation is required.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await getSupplierQuotation(supplierQuotationId);

        if (cancelled) {
          return;
        }

        setQuotation(result);

        if (result.status !== "ACCEPTED") {
          setError(
            "Only an accepted supplier quotation can be converted into a purchase order.",
          );
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load supplier quotation.",
        );

        setLoading(false);
      }
    }

    void loadQuotation();

    return () => {
      cancelled = true;
    };
  }, [supplierQuotationId]);

  const grandTotal = useMemo(() => {
    return Number(quotation?.total ?? 0);
  }, [quotation]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quotation) {
      return;
    }

    if (quotation.status !== "ACCEPTED") {
      setSubmitError(
        "Only an accepted supplier quotation can be converted into a purchase order.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");

      const created = await createPurchaseOrder({
        supplierQuotationId: quotation.id,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
      });

      router.push(`/purchase-orders/${created.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to create purchase order.",
      );

      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (quotation?.id) {
      router.push(`/supplier-quotations/${quotation.id}`);
      return;
    }

    router.push("/supplier-quotations");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-5 pb-8">
          <Link
            href="/supplier-quotations"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Supplier Quotations
          </Link>

          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading supplier quotation...
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !quotation) {
    return (
      <AppShell>
        <div className="space-y-5 pb-8">
          <Link
            href="/supplier-quotations"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Supplier Quotations
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-bold text-rose-900">
                  Unable to create Purchase Order
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {error || "Supplier quotation could not be loaded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const canCreate = quotation.status === "ACCEPTED";

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* BACK */}
        <Link
          href={`/supplier-quotations/${quotation.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supplier Quotation
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Create Purchase Order
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create a purchase order from the accepted supplier quotation.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Accepted quotation
          </div>
        </section>

        {/* SUBMIT ERROR */}
        {submitError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create Purchase Order</p>
              <p className="mt-0.5">{submitError}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TOP INFORMATION */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* PO DETAILS */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <SectionHeader
                icon={<ShoppingCart className="h-5 w-5" />}
                title="Purchase Order Details"
                description="Information for the new purchase order."
              />

              <div className="grid gap-x-5 gap-y-5 p-5 sm:grid-cols-2">
                <DetailItem
                  label="Supplier"
                  value={
                    <span className="block truncate">
                      {quotation.supplier.name}
                    </span>
                  }
                />

                <DetailItem
                  label="Supplier Code"
                  value={quotation.supplier.code}
                />

                <DetailItem label="Branch" value={quotation.branch.name} />

                <DetailItem
                  label="Purchase Request"
                  value={quotation.purchaseRequest?.requestNo || "—"}
                />

                <DetailItem label="Quotation" value={quotation.quotationNo} />

                <DetailItem
                  label="Quotation Date"
                  value={formatDate(quotation.quotationDate)}
                />

                <div className="sm:col-span-2">
                  <label
                    htmlFor="expectedDate"
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Expected Delivery
                  </label>

                  <div className="relative mt-1.5">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="expectedDate"
                      type="date"
                      value={expectedDate}
                      onChange={(event) => setExpectedDate(event.target.value)}
                      disabled={submitting}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SOURCE QUOTATION */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <SectionHeader
                icon={<FileText className="h-5 w-5" />}
                title="Source Quotation"
                description="Values below come from the accepted quotation."
              />

              <div className="p-5">
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
                  <DetailItem
                    label="Quotation No."
                    value={quotation.quotationNo}
                  />

                  <DetailItem
                    label="Status"
                    value={
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ACCEPTED
                      </span>
                    }
                  />

                  <DetailItem
                    label="Valid Until"
                    value={formatDate(quotation.validUntil)}
                  />

                  <DetailItem
                    label="Subtotal"
                    value={formatCurrency(quotation.subtotal)}
                  />

                  <DetailItem
                    label="Discount"
                    value={formatCurrency(quotation.discount)}
                  />

                  <DetailItem
                    label="Tax"
                    value={formatCurrency(quotation.tax)}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Quotation Total
                      </p>

                      <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                        {formatCurrency(quotation.total)}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                      <Truck className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* NOTES + ITEMS */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            {/* ITEMS */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <SectionHeader
                icon={<Package className="h-5 w-5" />}
                title="Purchase Order Items"
                description={`${quotation.items.length} item${
                  quotation.items.length === 1 ? "" : "s"
                } from the accepted quotation.`}
              />

              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Product
                      </th>

                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Qty
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Unit Cost
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {quotation.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {item.product.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {item.product.sku}
                              {item.product.brand
                                ? ` • ${item.product.brand}`
                                : ""}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                          {item.quantity} {item.product.unit}
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                          {formatCurrency(item.unitCost)}
                        </td>

                        <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="divide-y divide-slate-100 md:hidden">
                {quotation.items.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.product.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.product.sku}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Quantity
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {item.quantity} {item.product.unit}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Unit Cost
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatCurrency(item.unitCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-500">
                    Purchase Order Total
                  </span>

                  <span className="text-xl font-bold tracking-tight text-slate-950">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </section>

            {/* NOTES */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <SectionHeader
                icon={<FileText className="h-5 w-5" />}
                title="Purchase Order Notes"
                description="Optional instructions or delivery notes."
              />

              <div className="p-5">
                <label
                  htmlFor="notes"
                  className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={submitting}
                  rows={3}
                  maxLength={2000}
                  placeholder="Add delivery instructions, internal notes, or other PO details..."
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-[11px] text-slate-400">
                    {notes.length}/2000
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ACTIONS */}
          <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/10 backdrop-blur sm:p-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !canCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Purchase Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Create Purchase Order
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
