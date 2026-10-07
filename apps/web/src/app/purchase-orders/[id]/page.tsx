"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrder,
  sendPurchaseOrder,
  type PurchaseOrder,
} from "@/features/purchasing/purchase-orders-api";

import { getCurrentUser } from "@/lib/auth/session";

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
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
    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "APPROVED":
      return "bg-blue-50 text-blue-700";

    case "SENT":
      return "bg-violet-50 text-violet-700";

    case "PARTIALLY_RECEIVED":
      return "bg-orange-50 text-orange-700";

    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700";

    case "CLOSED":
      return "bg-slate-100 text-slate-600";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getTotalUnits(order: PurchaseOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function getReceivedUnits(order: PurchaseOrder) {
  return order.items.reduce(
    (sum, item) => sum + (item.receivedQuantity ?? 0),
    0,
  );
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  //const router = useRouter();

  const id = params?.id;

  const user = getCurrentUser();
  const role = user?.role;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadOrder() {
      try {
        const result = await getPurchaseOrder(id);

        if (cancelled) {
          return;
        }

        setOrder(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load purchase order.",
        );
        setLoading(false);
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleApprove() {
    if (!order) {
      return;
    }

    if (!window.confirm(`Approve purchase order ${order.poNumber}?`)) {
      return;
    }

    try {
      setActionLoading("approve");
      setError("");

      const updated = await approvePurchaseOrder(order.id);

      setOrder((current) =>
        current
          ? {
              ...current,
              status: updated.status,
            }
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve purchase order.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleSend() {
    if (!order) {
      return;
    }

    if (!window.confirm(`Mark purchase order ${order.poNumber} as sent?`)) {
      return;
    }

    try {
      setActionLoading("send");
      setError("");

      const updated = await sendPurchaseOrder(order.id);

      setOrder((current) =>
        current
          ? {
              ...current,
              status: updated.status,
            }
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send purchase order.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleCancel() {
    if (!order) {
      return;
    }

    if (
      !window.confirm(
        `Cancel purchase order ${order.poNumber}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setActionLoading("cancel");
      setError("");

      const updated = await cancelPurchaseOrder(order.id);

      setOrder((current) =>
        current
          ? {
              ...current,
              status: updated.status,
            }
          : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to cancel purchase order.",
      );
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading purchase order...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/purchase-orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchase Orders
          </Link>

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error || "Purchase order not found."}
          </div>
        </div>
      </AppShell>
    );
  }

  const totalUnits = getTotalUnits(order);
  const receivedUnits = getReceivedUnits(order);
  const canApprove =
    order.status === "DRAFT" && (role === "ADMIN" || role === "MANAGER");

  return (
    <AppShell>
      <div className="">
        {/* HEADER */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/purchase-orders"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Purchase Orders
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-primary">
                Purchasing
              </span>

              <span className="text-slate-300">/</span>

              <span className="font-mono text-sm text-slate-500">
                {order.poNumber}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {order.poNumber}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  order.status,
                )}`}
              >
                {order.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Purchase order details, supplier information, and receiving
              progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {order.status === "DRAFT" && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "cancel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Cancel
                </button>

                {canApprove && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!!actionLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading === "approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                )}
              </>
            )}

            {order.status === "APPROVED" && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "cancel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!!actionLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "send" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Mark as Sent
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total"
            value={formatMoney(order.total)}
            icon={<ShoppingCart className="h-5 w-5" />}
          />

          <SummaryCard
            label="Total Units"
            value={String(totalUnits)}
            icon={<FileText className="h-5 w-5" />}
          />

          <SummaryCard
            label="Received Units"
            value={`${receivedUnits} / ${totalUnits}`}
            icon={<Truck className="h-5 w-5" />}
          />

          <SummaryCard
            label="Order Date"
            value={formatDate(order.orderDate)}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        {/* MAIN CONTENT */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          {/* ITEMS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Purchase Order Items
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {order.items.length} line
                  {order.items.length === 1 ? "" : "s"}
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                {receivedUnits} of {totalUnits} units received
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <TableHeader>Product</TableHeader>
                    <TableHeader align="right">Qty</TableHeader>
                    <TableHeader align="right">Unit Cost</TableHeader>
                    <TableHeader align="right">Subtotal</TableHeader>
                    <TableHeader align="right">Received</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.product.name}
                        </p>

                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          {item.product.sku}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                        {item.quantity}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {formatMoney(item.unitCost)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatMoney(item.subtotal)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-700">
                          {item.receivedQuantity ?? 0}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          / {item.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <MoneyRow
                  label="Subtotal"
                  value={formatMoney(order.subtotal)}
                />

                <MoneyRow
                  label="Discount"
                  value={formatMoney(order.discount)}
                />

                <MoneyRow label="Tax" value={formatMoney(order.tax)} />

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-900">Total</span>

                  <span className="text-lg font-bold text-slate-950">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SIDE INFO */}
          <div className="space-y-6">
            <InfoCard icon={<Building2 className="h-5 w-5" />} title="Supplier">
              <InfoRow label="Supplier" value={order.supplier.name} />
              <InfoRow label="Code" value={order.supplier.code} />
              <InfoRow
                label="Contact"
                value={order.supplier.contactPerson ?? "—"}
              />
              <InfoRow
                label="Phone"
                value={order.supplier.contactNumber ?? "—"}
              />
            </InfoCard>

            <InfoCard
              icon={<ShoppingCart className="h-5 w-5" />}
              title="Branch & Dates"
            >
              <InfoRow label="Branch" value={order.branch.name} />
              <InfoRow label="Branch Code" value={order.branch.code} />
              <InfoRow label="Order Date" value={formatDate(order.orderDate)} />
              <InfoRow
                label="Expected Date"
                value={formatDate(order.expectedDate)}
              />
            </InfoCard>

            <InfoCard
              icon={<FileText className="h-5 w-5" />}
              title="Linked Documents"
            >
              <div className="space-y-3">
                {order.purchaseRequest ? (
                  <Link
                    href={`/purchase-requests/${order.purchaseRequest.id}`}
                    className="block rounded-xl border border-slate-200 px-4 py-3 transition hover:border-primary/30 hover:bg-slate-50"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Purchase Request
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {order.purchaseRequest.requestNo}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {order.purchaseRequest.status}
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Purchase Request
                    </p>
                    <p className="mt-1 text-sm text-slate-500">—</p>
                  </div>
                )}

                {order.supplierQuotation ? (
                  <Link
                    href={`/supplier-quotations/${order.supplierQuotation.id}`}
                    className="block rounded-xl border border-slate-200 px-4 py-3 transition hover:border-primary/30 hover:bg-slate-50"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Supplier Quotation
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {order.supplierQuotation.quotationNo}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {order.supplierQuotation.status}
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Supplier Quotation
                    </p>
                    <p className="mt-1 text-sm text-slate-500">—</p>
                  </div>
                )}
              </div>
            </InfoCard>

            <InfoCard icon={<FileText className="h-5 w-5" />} title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {order.notes || "No notes provided."}
              </p>
            </InfoCard>
          </div>
        </div>

        {/* RECEIVING NOTICE */}
        {(order.status === "SENT" ||
          order.status === "PARTIALLY_RECEIVED" ||
          order.status === "RECEIVED") && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Truck className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Receiving
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    This purchase order is now in the delivery/receiving stage.
                    Receiving records can be managed from the Receiving module.
                  </p>
                </div>
              </div>

              <Link
                href="/receiving"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/20 hover:text-primary"
              >
                <Truck className="h-4 w-4" />
                Open Receiving
              </Link>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-lg font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>

        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>

      <div className="pt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
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
