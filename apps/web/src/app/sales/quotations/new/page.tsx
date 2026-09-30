"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  Receipt,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getCurrentUser } from "@/lib/auth/session";

import {
  createSalesQuotation,
  getSalesInquiry,
  type SalesInquiry,
} from "@/features/sales/sales-api";

type QuotationItemForm = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

function toNumber(value: string | number | null | undefined) {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function NewQuotationPage() {
  const searchParams = useSearchParams();

  const inquiryId = searchParams.get("inquiryId") ?? "";

  const user = getCurrentUser();

  const [inquiry, setInquiry] = useState<SalesInquiry | null>(null);

  const [items, setItems] = useState<QuotationItemForm[]>([]);

  const [validUntil, setValidUntil] = useState("");

  const [discount, setDiscount] = useState(0);

  const [tax, setTax] = useState(0);

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(Boolean(inquiryId));

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(
    inquiryId ? "" : "No inquiry was specified.",
  );

  const [createdQuotation, setCreatedQuotation] = useState<string | null>(null);

  useEffect(() => {
    if (!inquiryId) {
      return;
    }

    let cancelled = false;

    async function loadInquiry() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesInquiry(inquiryId);

        if (cancelled) {
          return;
        }

        setInquiry(result);

        setItems(
          result.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: toNumber(item.product.defaultSellingPrice),
          })),
        );

        setNotes(result.notes ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load the inquiry.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInquiry();

    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const total = Math.max(0, subtotal - discount + tax);

  function updateItem(index: number, changes: Partial<QuotationItemForm>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  }

  function adjustQuantity(index: number, delta: number) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + delta),
            }
          : item,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!inquiry) {
      setError("Inquiry information is not available.");
      return;
    }

    if (!user) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!user.branchId) {
      setError("Your account is not assigned to a branch.");
      return;
    }

    const invalidItem = items.find(
      (item) => !item.productId || item.quantity < 1 || item.unitPrice <= 0,
    );

    if (invalidItem) {
      setError("Every item must have a valid quantity and unit price.");
      return;
    }

    if (discount < 0 || tax < 0) {
      setError("Discount and tax cannot be negative.");
      return;
    }

    if (discount > subtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await createSalesQuotation({
        branchId: inquiry.branchId,
        customerId: inquiry.customerId,
        inquiryId: inquiry.id,

        // The backend validates that this user is active
        // and belongs to the inquiry branch.
        salespersonId: user.id,

        validUntil: validUntil || undefined,

        discount,
        tax,

        notes: notes.trim() || undefined,

        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      setCreatedQuotation(result.quotationNo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create quotation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      </AppShell>
    );
  }

  if (createdQuotation) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <p className="mt-5 text-sm font-semibold text-emerald-600">
              Quotation created successfully
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {createdQuotation}
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The inquiry is now marked as{" "}
              <span className="font-semibold text-slate-700">QUOTED</span>.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/sales/inquiries/${inquiryId}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Inquiry
              </Link>

              <Link
                href="/sales/quotations"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View Quotations
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!inquiry) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/inquiries"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inquiries
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
            {error || "The inquiry could not be loaded."}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <section>
          <Link
            href={`/sales/inquiries/${inquiry.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inquiry
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <Receipt className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">Sales</p>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                New Quotation
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Prepare pricing for inquiry{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {inquiry.inquiryNo}
                </span>
                .
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create quotation</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* CUSTOMER / SALESPERSON */}
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Customer</h2>
            </div>

            <div className="p-5">
              <p className="text-lg font-semibold text-slate-900">
                {inquiry.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {inquiry.customer.code}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Salesperson</h2>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {(user?.fullName || user?.username || "U")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user?.fullName || user?.username || "Current User"}
                  </p>

                  <p className="text-xs text-slate-400">{user?.role || "—"}</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* QUOTATION ITEMS */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Quotation Items</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Review quantities and enter selling prices.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item, index) => {
                const inquiryItem = inquiry.items[index];

                if (!inquiryItem) {
                  return null;
                }

                return (
                  <div key={`${item.productId}-${index}`} className="px-5 py-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_130px_180px]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {inquiryItem.product.name}
                        </p>

                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {inquiryItem.product.sku}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Quantity
                        </label>

                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(index, -1)}
                            disabled={item.quantity <= 1}
                            className="flex h-full w-10 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-800">
                            {item.quantity}
                          </div>

                          <button
                            type="button"
                            onClick={() => adjustQuantity(index, 1)}
                            className="flex h-full w-10 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`price-${index}`}
                          className="text-sm font-semibold text-slate-700"
                        >
                          Unit Price
                        </label>

                        <input
                          id={`price-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(index, {
                              unitPrice: Math.max(
                                0,
                                Number(event.target.value) || 0,
                              ),
                            })
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <span className="text-xs font-medium text-slate-500">
                        Line total
                      </span>

                      <span className="text-sm font-bold text-slate-800">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TERMS / TOTALS */}
          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-950">
                  Quotation Details
                </h2>
              </div>

              <div className="space-y-5 p-5">
                <div className="space-y-2">
                  <label
                    htmlFor="valid-until"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Valid Until
                  </label>

                  <input
                    id="valid-until"
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="notes"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    rows={6}
                    maxLength={2000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add quotation notes..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-950">Summary</h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>

                  <span className="font-semibold text-slate-800">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="discount"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Discount
                  </label>

                  <input
                    id="discount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="tax"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Tax
                  </label>

                  <input
                    id="tax"
                    type="number"
                    min={0}
                    step="0.01"
                    value={tax}
                    onChange={(event) =>
                      setTax(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">
                      Total
                    </span>

                    <span className="text-2xl font-bold tracking-tight text-slate-950">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Final total is calculated and validated by the backend.
                  </p>
                </div>
              </div>
            </article>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/sales/inquiries/${inquiry.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Quotation...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4" />
                  Create Quotation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
