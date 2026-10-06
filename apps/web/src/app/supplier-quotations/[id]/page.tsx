"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Loader2,
  Package,
  UserRound,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  acceptSupplierQuotation,
  cancelSupplierQuotation,
  getSupplierQuotation,
  receiveSupplierQuotation,
  rejectSupplierQuotation,
  type SupplierQuotation,
} from "@/features/purchasing/supplier-quotations-api";

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "RECEIVED":
      return "bg-blue-50 text-blue-700";

    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-rose-50 text-rose-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "DRAFT":
      return <Clock3 className="h-4 w-4" />;

    case "RECEIVED":
      return <FileCheck2 className="h-4 w-4" />;

    case "ACCEPTED":
      return <CheckCircle2 className="h-4 w-4" />;

    case "REJECTED":
      return <XCircle className="h-4 w-4" />;

    case "CANCELLED":
      return <Ban className="h-4 w-4" />;

    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function SupplierQuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [quotation, setQuotation] = useState<SupplierQuotation | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadQuotation() {
      if (!id) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await getSupplierQuotation(id);

        if (cancelled) {
          return;
        }

        setQuotation(result);
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
  }, [id]);

  async function reloadQuotation() {
    if (!id) {
      return;
    }

    const result = await getSupplierQuotation(id);
    setQuotation(result);
  }

  async function handleAction(
    action: "receive" | "accept" | "reject" | "cancel",
  ) {
    if (!quotation) {
      return;
    }

    const confirmationMessage =
      action === "receive"
        ? "Receive this supplier quotation?"
        : action === "accept"
          ? "Accept this supplier quotation?"
          : action === "reject"
            ? "Reject this supplier quotation?"
            : "Cancel this supplier quotation?";

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      setSuccessMessage("");

      if (action === "receive") {
        await receiveSupplierQuotation(quotation.id);
      }

      if (action === "accept") {
        await acceptSupplierQuotation(quotation.id);
      }

      if (action === "reject") {
        await rejectSupplierQuotation(quotation.id);
      }

      if (action === "cancel") {
        await cancelSupplierQuotation(quotation.id);
      }

      await reloadQuotation();

      const message =
        action === "receive"
          ? "Supplier quotation received successfully."
          : action === "accept"
            ? "Supplier quotation accepted successfully."
            : action === "reject"
              ? "Supplier quotation rejected successfully."
              : "Supplier quotation cancelled successfully.";

      setSuccessMessage(message);
      setActionLoading(false);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to update supplier quotation.",
      );
      setActionLoading(false);
    }
  }

  const canReceive = quotation?.status === "DRAFT";
  const canReview = quotation?.status === "RECEIVED";
  const canCancel =
    quotation?.status === "DRAFT" || quotation?.status === "RECEIVED";

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/supplier-quotations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supplier Quotations
        </Link>

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading supplier quotation...
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load supplier quotation</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {!loading && !error && quotation && (
          <>
            {/* HEADER */}
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">Purchasing</p>

                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {quotation.quotationNo}
                  </h1>

                  <span
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                      quotation.status,
                    )}`}
                  >
                    {getStatusIcon(quotation.status)}
                    {quotation.status}
                  </span>
                </div>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Review supplier quotation details, requested items, pricing,
                  and approval status.
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-wrap items-center gap-2">
                {canReceive && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleAction("receive")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-4 w-4" />
                    )}
                    Receive Quotation
                  </button>
                )}

                {canReview && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleAction("accept")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Accept
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleAction("reject")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}

                {canCancel && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleAction("cancel")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            </section>

            {/* SUCCESS */}
            {successMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="font-semibold">{successMessage}</p>
                </div>
              </div>
            )}

            {/* ACTION ERROR */}
            {actionError && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="font-semibold">
                    Unable to update supplier quotation
                  </p>

                  <p className="mt-0.5">{actionError}</p>
                </div>
              </div>
            )}

            {/* SUMMARY */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Supplier"
                value={quotation.supplier.name}
                icon={<UserRound className="h-4 w-4" />}
              />

              <SummaryCard
                label="Purchase Request"
                value={quotation.purchaseRequest?.requestNo ?? "--"}
                icon={<ClipboardList className="h-4 w-4" />}
                href={
                  quotation.purchaseRequest?.id
                    ? `/purchase-requests/${quotation.purchaseRequest.id}`
                    : undefined
                }
              />

              <SummaryCard
                label="Branch"
                value={quotation.branch.name}
                icon={<Building2 className="h-4 w-4" />}
              />

              <SummaryCard
                label="Total"
                value={formatCurrency(quotation.total)}
                icon={<FileText className="h-4 w-4" />}
              />
            </section>

            {/* GENERAL DETAILS */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Quotation Details
                    </h2>

                    <p className="text-xs text-slate-400">
                      Supplier quotation and purchasing references.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem
                  label="Quotation No."
                  value={quotation.quotationNo}
                />

                <DetailItem
                  label="Quotation Date"
                  value={formatDate(quotation.quotationDate)}
                  icon={<CalendarDays className="h-4 w-4" />}
                />

                <DetailItem
                  label="Valid Until"
                  value={formatDate(quotation.validUntil)}
                  icon={<CalendarDays className="h-4 w-4" />}
                />

                <DetailItem
                  label="Supplier Code"
                  value={quotation.supplier.code}
                />

                <DetailItem
                  label="Purchase Request"
                  value={quotation.purchaseRequest?.requestNo ?? "--"}
                  href={
                    quotation.purchaseRequest?.id
                      ? `/purchase-requests/${quotation.purchaseRequest.id}`
                      : undefined
                  }
                />

                <DetailItem
                  label="Branch"
                  value={`${quotation.branch.name} (${quotation.branch.code})`}
                  icon={<Building2 className="h-4 w-4" />}
                />

                <DetailItem
                  label="Created"
                  value={formatDate(quotation.createdAt)}
                  icon={<Clock3 className="h-4 w-4" />}
                />

                <DetailItem
                  label="Last Updated"
                  value={formatDate(quotation.updatedAt)}
                  icon={<Clock3 className="h-4 w-4" />}
                />
              </div>
            </section>

            {/* ITEMS */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Quotation Items
                    </h2>

                    <p className="text-xs text-slate-400">
                      Products and supplier pricing included in this quotation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <TableHeader>Product</TableHeader>
                      <TableHeader>SKU</TableHeader>
                      <TableHeader align="right">Quantity</TableHeader>
                      <TableHeader align="right">Unit Cost</TableHeader>
                      <TableHeader align="right">Subtotal</TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {quotation.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.product.name}
                          </p>

                          {(item.product.brand || item.product.model) && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {[item.product.brand, item.product.model]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {item.product.sku}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-slate-700">
                            {item.quantity}
                          </span>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.product.unit}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm text-slate-700">
                            {formatCurrency(item.unitCost)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTALS */}
              <div className="border-t border-slate-100 bg-slate-50/50">
                <div className="ml-auto max-w-sm space-y-3 px-5 py-5">
                  <TotalRow
                    label="Subtotal"
                    value={formatCurrency(quotation.subtotal)}
                  />

                  <TotalRow
                    label="Discount"
                    value={formatCurrency(quotation.discount)}
                  />

                  <TotalRow label="Tax" value={formatCurrency(quotation.tax)} />

                  <div className="border-t border-slate-200 pt-3">
                    <TotalRow
                      label="Grand Total"
                      value={formatCurrency(quotation.total)}
                      strong
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* NOTES */}
            {quotation.notes && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Notes
                      </h2>

                      <p className="text-xs text-slate-400">
                        Additional quotation notes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {quotation.notes}
                  </p>
                </div>
              </section>
            )}

            {/* ACCEPTED NEXT STEP */}
            {quotation.status === "ACCEPTED" && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-emerald-900">
                        Supplier quotation accepted
                      </h2>

                      <p className="mt-1 text-sm leading-5 text-emerald-800">
                        This quotation is ready for the next purchasing step:
                        creating a Purchase Order.
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/purchase-orders/new?supplierQuotationId=${quotation.id}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  >
                    <FileText className="h-4 w-4" />
                    Create Purchase Order
                  </Link>
                </div>
              </section>
            )}

            {/* REJECTED */}
            {quotation.status === "REJECTED" && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
                    <XCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-rose-900">
                      Supplier quotation rejected
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-rose-800">
                      This quotation is no longer available for acceptance or
                      cancellation.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CANCELLED */}
            {quotation.status === "CANCELLED" && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                    <Ban className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Supplier quotation cancelled
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This quotation is closed and cannot continue through the
                      purchasing lifecycle.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl transition hover:-translate-y-0.5"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function DetailItem({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="border-b border-slate-100 px-5 py-4 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1.5 flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}

        <span className="text-sm font-semibold text-slate-800">{value}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:bg-slate-50">
        {content}
      </Link>
    );
  }

  return content;
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong ? "text-sm font-bold text-slate-900" : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-base font-bold text-slate-950"
            : "text-sm font-semibold text-slate-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
