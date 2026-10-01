"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  PackageCheck,
  Truck,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  checkSalesOrderInventory,
  getSalesOrder,
  prepareSalesOrder,
  createSalesInvoiceFromOrder,
  releaseSalesOrder,
  reserveSalesOrder,
  type InventoryCheckResult,
  type SalesOrder,
  type SalesOrderDeliveryMode,
  type SalesPaymentMode,
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
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700";

    case "RESERVED":
      return "bg-amber-50 text-amber-700";

    case "READY":
      return "bg-emerald-50 text-emerald-700";

    case "DELIVERED":
      return "bg-violet-50 text-violet-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStepClass(
  status: string,
  step: "CONFIRMED" | "RESERVED" | "READY" | "DELIVERED",
) {
  const steps = ["CONFIRMED", "RESERVED", "READY", "DELIVERED"];

  const currentIndex = steps.indexOf(status);
  const stepIndex = steps.indexOf(step);

  return stepIndex <= currentIndex
    ? "bg-primary text-white"
    : "bg-slate-100 text-slate-400";
}

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [inventoryCheck, setInventoryCheck] =
    useState<InventoryCheckResult | null>(null);

  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const [invoicePaymentMode, setInvoicePaymentMode] =
    useState<SalesPaymentMode>("CASH");

  const [deliveryMode, setDeliveryMode] =
    useState<SalesOrderDeliveryMode>("CUSTOMER_PICKUP");
  const [deliveryDate, setDeliveryDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesOrder(id);

        if (!cancelled) {
          setOrder(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load sales order.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleCheckInventory() {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const result = await checkSalesOrderInventory(order.id);

      setInventoryCheck(result);

      if (result.allAvailable) {
        setSuccess("All required inventory is available.");
      } else {
        setError("Some items do not have enough available inventory.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to check inventory.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReserve() {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const updated = await reserveSalesOrder(order.id);

      setOrder(updated);
      setInventoryCheck(null);

      setSuccess("Inventory has been reserved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reserve inventory.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handlePrepare() {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const updated = await prepareSalesOrder(order.id);

      setOrder(updated);

      setSuccess("Sales order is now ready for release.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to prepare sales order.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleRelease() {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const updated = await releaseSalesOrder(order.id, {
        deliveryMode,
        deliveryDate: deliveryDate
          ? new Date(deliveryDate).toISOString()
          : undefined,
      });

      setOrder(updated);

      setSuccess("Sales order released successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to release sales order.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleCreateInvoice() {
    if (!order) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const invoice = await createSalesInvoiceFromOrder(
        order.id,
        invoicePaymentMode,
      );

      setShowInvoiceDialog(false);

      setSuccess(`Sales invoice ${invoice.invoiceNo} created successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create sales invoice.",
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
            Loading sales order...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Orders
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
            {error || "Sales order could not be loaded."}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <Link
          href="/sales/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Orders
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {order.orderNo}
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
              Manage fulfillment from confirmed order to delivery.
            </p>
          </div>

          {/* ACTION */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {order.status === "CONFIRMED" && (
              <>
                {!inventoryCheck ? (
                  <button
                    type="button"
                    onClick={handleCheckInventory}
                    disabled={processing}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                    {processing ? "Checking Inventory..." : "Check Inventory"}
                  </button>
                ) : inventoryCheck.allAvailable ? (
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={processing}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Boxes className="h-4 w-4" />
                    )}
                    {processing ? "Reserving..." : "Reserve Inventory"}
                  </button>
                ) : null}
              </>
            )}

            {order.status === "RESERVED" && (
              <button
                type="button"
                onClick={handlePrepare}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                {processing ? "Preparing..." : "Mark Ready"}
              </button>
            )}
          </div>
        </section>

        {/* MESSAGES */}
        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="font-semibold">{success}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* STATUS FLOW */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="font-semibold text-slate-950">Fulfillment Status</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Current position in the sales order workflow
          </p>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              ["CONFIRMED", "Confirmed"],
              ["RESERVED", "Reserved"],
              ["READY", "Ready"],
              ["DELIVERED", "Delivered"],
            ].map(([value, label]) => (
              <div key={value} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${getStepClass(
                    order.status,
                    value as "CONFIRMED" | "RESERVED" | "READY" | "DELIVERED",
                  )}`}
                >
                  {["CONFIRMED", "RESERVED", "READY", "DELIVERED"].indexOf(
                    value,
                  ) + 1}
                </div>

                <span className="text-[11px] font-semibold text-slate-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* INVENTORY CHECK */}
        {inventoryCheck && order.status === "CONFIRMED" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Inventory Availability
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Current stock versus quantities required for this order.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {inventoryCheck.items.map((item) => {
                const orderItem = order.items.find(
                  (entry) => entry.id === item.salesOrderItemId,
                );

                return (
                  <div
                    key={item.salesOrderItemId}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {orderItem?.product.name ?? "Product"}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {orderItem?.product.sku ?? "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-right text-xs">
                      <div>
                        <p className="text-slate-400">Requested</p>
                        <p className="mt-1 font-bold text-slate-800">
                          {item.requestedQuantity}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Available</p>
                        <p
                          className={`mt-1 font-bold ${
                            item.available
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {item.availableQuantity ?? "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Status</p>
                        <p
                          className={`mt-1 font-bold ${
                            item.available
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {item.inventoryTracked
                            ? item.available
                              ? "Available"
                              : "Insufficient"
                            : "Not tracked"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CUSTOMER / ORDER DETAILS */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23, 42,0.04)]">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Customer</h2>
            </div>

            <div className="mt-5">
              <p className="text-base font-semibold text-slate-900">
                {order.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {order.customer.code}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Order Details</h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Order Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(order.orderDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Quotation
                </p>

                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {order.quotation?.quotationNo ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Branch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {order.branch.name}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Delivery
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {order.deliveryMode === "CUSTOMER_PICKUP"
                    ? "Customer Pickup"
                    : order.deliveryMode === "DELIVERY"
                      ? "Delivery"
                      : "Not released"}
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

              <h2 className="font-semibold text-slate-950">
                Sales Order Items
              </h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Items included in this customer order.
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
                {order.items.map((item) => (
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

        {/* RELEASE */}
        {order.status === "READY" && (
          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-primary">
                <Truck className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-950">Release Order</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose how the customer will receive the items.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="delivery-mode"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Delivery Mode
                    </label>

                    <select
                      id="delivery-mode"
                      value={deliveryMode}
                      onChange={(event) =>
                        setDeliveryMode(
                          event.target.value as SalesOrderDeliveryMode,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="CUSTOMER_PICKUP">Customer Pickup</option>

                      <option value="DELIVERY">Delivery</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="delivery-date"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Delivery / Release Date
                    </label>

                    <input
                      id="delivery-date"
                      type="datetime-local"
                      value={deliveryDate}
                      onChange={(event) => setDeliveryDate(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={processing}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}

                  {processing ? "Releasing..." : "Release Order"}
                </button>
              </div>
            </div>
          </section>
        )}

        {order.status === "DELIVERED" && !order.salesInvoice && (
          <button
            type="button"
            onClick={() => setShowInvoiceDialog(true)}
            disabled={processing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            Create Sales Invoice
          </button>
        )}

        {order.status === "DELIVERED" && order.salesInvoice && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Sales Invoice Already Created
              </p>

              <p className="text-xs text-emerald-700">
                {order.salesInvoice.invoiceNo}
              </p>
            </div>
          </div>
        )}

        {/* SUMMARY */}
        <section className="flex justify-end">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Order Summary</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(order.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(order.tax)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="font-mono text-xl font-bold text-slate-950">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showInvoiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-primary">Sales</p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Create Sales Invoice
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose the payment mode for this delivered sales order.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setInvoicePaymentMode("CASH")}
                className={[
                  "w-full rounded-xl border px-4 py-4 text-left transition",
                  invoicePaymentMode === "CASH"
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">Cash</p>

                <p className="mt-1 text-xs text-slate-500">
                  Customer pays immediately.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInvoicePaymentMode("CREDIT")}
                className={[
                  "w-full rounded-xl border px-4 py-4 text-left transition",
                  invoicePaymentMode === "CREDIT"
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">Credit</p>

                <p className="mt-1 text-xs text-slate-500">
                  Create invoice and record the customer balance in A/R.
                </p>
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowInvoiceDialog(false)}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" />}

                {processing ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
