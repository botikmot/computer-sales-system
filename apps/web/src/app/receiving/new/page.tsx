"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Loader2,
  Package,
  Save,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  createReceiving,
  getPurchaseOrder,
  getPurchaseOrdersForReceiving,
  type PurchaseOrderForReceiving,
} from "@/features/purchasing/receivings-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

type ReceivingLine = {
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  orderedQuantity: number;
  previouslyReceived: number;
  remainingQuantity: number;
  unitCost: string | number;
  quantityReceived: number;
  notes: string;
};

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

export default function NewReceivingPage() {
  const router = useRouter();

  const [purchaseOrders, setPurchaseOrders] = useState<
    PurchaseOrderForReceiving[]
  >([]);

  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState("");

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrderForReceiving | null>(null);

  const [lines, setLines] = useState<ReceivingLine[]>([]);

  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(true);
  const [loadingPurchaseOrder, setLoadingPurchaseOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPurchaseOrders() {
      try {
        setLoadingPurchaseOrders(true);
        setError("");

        const result = await getPurchaseOrdersForReceiving();

        if (cancelled) {
          return;
        }

        setPurchaseOrders(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase orders.",
        );
      } finally {
        if (!cancelled) {
          setLoadingPurchaseOrders(false);
        }
      }
    }

    void loadPurchaseOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchaseOrderChange(value: string) {
    setSelectedPurchaseOrderId(value);
    setPurchaseOrder(null);
    setLines([]);
    setError("");
    setSuccessMessage("");

    if (!value) {
      return;
    }

    try {
      setLoadingPurchaseOrder(true);

      const result = await getPurchaseOrder(value);

      const nextLines: ReceivingLine[] = result.items.map((item) => {
        const remainingQuantity = Math.max(
          item.quantity - item.receivedQuantity,
          0,
        );

        return {
          purchaseOrderItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          unit: item.product.unit || "pcs",
          orderedQuantity: item.quantity,
          previouslyReceived: item.receivedQuantity,
          remainingQuantity,
          unitCost: item.unitCost,
          quantityReceived: 0,
          notes: "",
        };
      });

      setPurchaseOrder(result);
      setLines(nextLines);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load purchase order.",
      );
    } finally {
      setLoadingPurchaseOrder(false);
    }
  }

  function updateQuantity(index: number, value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              quantityReceived: Math.min(
                Math.floor(parsed),
                line.remainingQuantity,
              ),
            }
          : line,
      ),
    );
  }

  function updateLineNotes(index: number, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              notes: value,
            }
          : line,
      ),
    );
  }

  const selectedLines = useMemo(
    () => lines.filter((line) => line.quantityReceived > 0),
    [lines],
  );

  const totalQuantity = useMemo(
    () => selectedLines.reduce((sum, line) => sum + line.quantityReceived, 0),
    [selectedLines],
  );

  const estimatedValue = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + line.quantityReceived * Number(line.unitCost),
        0,
      ),
    [selectedLines],
  );

  const purchaseOrderOptions: SelectOption[] = purchaseOrders.map((order) => ({
    value: order.id,
    label: order.poNumber,
    description: `${order.supplier.name} • ${order.status} • ${formatDate(
      order.orderDate,
    )}`,
  }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!purchaseOrder) {
      setError("Please select a purchase order.");
      return;
    }

    if (selectedLines.length === 0) {
      setError("Enter a received quantity for at least one item.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await createReceiving({
        purchaseOrderId: purchaseOrder.id,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        items: selectedLines.map((line) => ({
          purchaseOrderItemId: line.purchaseOrderItemId,
          quantityReceived: line.quantityReceived,
          notes: line.notes.trim() || undefined,
        })),
      });

      setSuccessMessage(
        `Receiving ${result.receivingNo} created successfully.`,
      );

      router.push(`/receiving/${result.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create receiving report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/receiving"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Receiving
        </Link>

        {/* HEADER */}
        <section>
          <p className="text-sm font-semibold text-primary">Inventory</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Receiving
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Record items delivered by a supplier against an open purchase order.
          </p>
        </section>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create receiving</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Package className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Receiving created</p>
              <p className="mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SOURCE PO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Source Purchase Order
              </h2>
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Purchase Order
              </label>

              <SearchableSelect
                value={selectedPurchaseOrderId}
                onChange={handlePurchaseOrderChange}
                options={purchaseOrderOptions}
                placeholder="Select purchase order"
                searchPlaceholder="Search purchase order..."
                emptyMessage="No purchase orders available for receiving."
                disabled={
                  loadingPurchaseOrders || loadingPurchaseOrder || submitting
                }
                loading={loadingPurchaseOrders}
                className="mt-2 max-w-3xl"
              />

              <p className="mt-2 text-xs text-slate-400">
                Only SENT and PARTIALLY_RECEIVED purchase orders are available
                for receiving.
              </p>
            </div>

            {purchaseOrder && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  label="Purchase Order"
                  value={purchaseOrder.poNumber}
                />

                <InfoCard
                  label="Supplier"
                  value={purchaseOrder.supplier.name}
                />

                <InfoCard
                  label="Order Date"
                  value={formatDate(purchaseOrder.orderDate)}
                />

                <InfoCard label="PO Status" value={purchaseOrder.status} />
              </div>
            )}
          </section>

          {/* RECEIVING DETAILS */}
          {purchaseOrder && (
            <>
              {/* RECEIVING DETAILS + ITEMS HEADER */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* RECEIVING DETAILS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />

                    <h2 className="font-semibold text-slate-950">
                      Receiving Details
                    </h2>
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor="referenceNo"
                      className="text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Reference No.
                    </label>

                    <input
                      id="referenceNo"
                      value={referenceNo}
                      onChange={(event) => setReferenceNo(event.target.value)}
                      maxLength={100}
                      disabled={submitting}
                      placeholder="Supplier DR / delivery reference"
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </section>

                {/* RECEIVING NOTES */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />

                    <h2 className="font-semibold text-slate-950">
                      Receiving Notes
                    </h2>
                  </div>

                  <div className="mt-5">
                    <label
                      htmlFor="notes"
                      className="text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Notes
                    </label>

                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={2}
                      maxLength={2000}
                      disabled={submitting}
                      placeholder="Optional receiving notes..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </section>
              </div>

              {/* ITEMS */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />

                      <h2 className="font-semibold text-slate-950">
                        Items to Receive
                      </h2>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Enter only the quantity physically received.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Selected quantity</p>

                    <p className="text-lg font-bold text-slate-900">
                      {totalQuantity}
                    </p>
                  </div>
                </div>

                {loadingPurchaseOrder ? (
                  <div className="flex h-56 items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading purchase order...
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <TableHeader>Product</TableHeader>
                          <TableHeader>SKU</TableHeader>
                          <TableHeader align="right">Ordered</TableHeader>
                          <TableHeader align="right">
                            Previously Received
                          </TableHeader>
                          <TableHeader align="right">Remaining</TableHeader>
                          <TableHeader align="right">Unit Cost</TableHeader>
                          <TableHeader align="right">Receive Now</TableHeader>
                          <TableHeader>Notes</TableHeader>
                        </tr>
                      </thead>

                      <tbody>
                        {lines.map((line, index) => (
                          <tr
                            key={line.purchaseOrderItemId}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {line.productName}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Unit: {line.unit}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-semibold text-slate-600">
                                {line.sku}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {line.orderedQuantity}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {line.previouslyReceived}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-semibold text-slate-800">
                                {line.remainingQuantity}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-slate-600">
                              {formatCurrency(line.unitCost)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <input
                                type="number"
                                min={0}
                                max={line.remainingQuantity}
                                step={1}
                                value={line.quantityReceived}
                                disabled={
                                  submitting || line.remainingQuantity === 0
                                }
                                onChange={(event) =>
                                  updateQuantity(index, event.target.value)
                                }
                                className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                              />
                            </td>

                            <td className="px-5 py-4">
                              <input
                                type="text"
                                maxLength={500}
                                value={line.notes}
                                disabled={
                                  submitting || line.remainingQuantity === 0
                                }
                                onChange={(event) =>
                                  updateLineNotes(index, event.target.value)
                                }
                                placeholder="Optional"
                                className="h-10 w-52 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* SUMMARY / ACTIONS */}
              <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Receiving workflow
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">1.</span>{" "}
                      Create the receiving report as a draft.
                    </p>

                    <p>
                      <span className="font-semibold text-slate-800">2.</span>{" "}
                      Verify quantity and quality after the physical check.
                    </p>

                    <p>
                      <span className="font-semibold text-slate-800">3.</span>{" "}
                      Post the verified receiving to update inventory.
                    </p>
                  </div>
                </div>

                <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <h2 className="font-semibold text-slate-950">
                    Receiving Summary
                  </h2>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Items Selected</span>

                      <span className="font-semibold text-slate-800">
                        {selectedLines.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Quantity</span>

                      <span className="font-semibold text-slate-800">
                        {totalQuantity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-sm font-semibold text-slate-700">
                        Estimated Cost
                      </span>

                      <span className="text-lg font-bold text-slate-950">
                        {formatCurrency(estimatedValue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        loadingPurchaseOrder ||
                        !purchaseOrder ||
                        selectedLines.length === 0
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Create Receiving
                        </>
                      )}
                    </button>

                    <Link
                      href="/receiving"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )}
        </form>
      </div>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
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
