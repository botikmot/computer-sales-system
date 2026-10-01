"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Package,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getCurrentUser } from "@/lib/auth/session";

import {
  approveInventoryAdjustment,
  cancelInventoryAdjustment,
  confirmInventoryAdjustment,
  countInventoryAdjustment,
  getInventoryAdjustment,
  postInventoryAdjustment,
  rejectInventoryAdjustment,
  submitInventoryAdjustment,
  type InventoryAdjustment,
  type InventoryAdjustmentCountItemPayload,
} from "@/features/inventory/inventory-adjustment-api";

import { getProducts, type Product } from "@/features/products/products-api";

type CountFormItem = {
  productId: string;
  countedQuantity: number;
  reason: string;
  notes: string;
};

const EMPTY_COUNT_ITEM: CountFormItem = {
  productId: "",
  countedQuantity: 0,
  reason: "",
  notes: "",
};

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

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

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
    case "APPROVED":
    case "CONFIRMED":
      return "bg-emerald-50 text-emerald-700";

    case "COUNTED":
      return "bg-blue-50 text-blue-700";

    case "FOR_APPROVAL":
      return "bg-amber-50 text-amber-700";

    case "REJECTED":
    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function InventoryAdjustmentDetailPage() {
  const params = useParams();

  const id = typeof params.id === "string" ? params.id : "";

  const currentUser = getCurrentUser();

  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(
    null,
  );

  const [products, setProducts] = useState<Product[]>([]);

  const [countItems, setCountItems] = useState<CountFormItem[]>([
    { ...EMPTY_COUNT_ITEM },
  ]);

  const [rejectionReason, setRejectionReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const canApprove =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadPage() {
      try {
        const [adjustmentResult, productsResult] = await Promise.all([
          getInventoryAdjustment(id),
          getProducts({
            page: 1,
            limit: 100,
            isActive: true,
            sortBy: "name",
            sortOrder: "asc",
          }),
        ]);

        if (cancelled) {
          return;
        }

        setAdjustment(adjustmentResult);
        setProducts(productsResult.items);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load inventory adjustment.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setProductsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* async function reloadAdjustment() {
    if (!id) {
      return;
    }

    try {
      const result = await getInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh inventory adjustment.",
      );
    }
  } */

  function updateCountItem(index: number, changes: Partial<CountFormItem>) {
    setCountItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }

  function addCountItem() {
    setCountItems((current) => [...current, { ...EMPTY_COUNT_ITEM }]);
  }

  function removeCountItem(index: number) {
    setCountItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function validateCountForm() {
    if (countItems.length === 0) {
      return "Add at least one product.";
    }

    if (countItems.some((item) => !item.productId)) {
      return "Please select a product for every row.";
    }

    const productIds = countItems.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      return "A product can only appear once in an adjustment.";
    }

    if (
      countItems.some(
        (item) =>
          !Number.isInteger(item.countedQuantity) || item.countedQuantity < 0,
      )
    ) {
      return "Physical quantity must be a whole number greater than or equal to zero.";
    }

    return "";
  }

  async function handleSaveCount() {
    const validationError = validateCountForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!id) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const items: InventoryAdjustmentCountItemPayload[] = countItems.map(
        (item) => ({
          productId: item.productId,
          countedQuantity: item.countedQuantity,
          reason: item.reason.trim() || undefined,
          notes: item.notes.trim() || undefined,
        }),
      );

      const result = await countInventoryAdjustment(id, {
        items,
      });

      setAdjustment(result);
      setCountItems([{ ...EMPTY_COUNT_ITEM }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save physical count.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!id) return;

    if (
      !window.confirm("Confirm this inventory adjustment with no differences?")
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await confirmInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to confirm inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!id) return;

    if (!window.confirm("Submit this adjustment for approval?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await submitInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!id) return;

    if (!window.confirm("Approve this inventory adjustment?")) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await approveInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!id) return;

    const reason = rejectionReason.trim();

    if (reason.length < 3) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await rejectInventoryAdjustment(id, {
        rejectionReason: reason,
      });

      setAdjustment(result);
      setRejectionReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePost() {
    if (!id) return;

    if (
      !window.confirm(
        "Post this adjustment? Inventory quantities will be updated.",
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await postInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to post inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!id) return;

    if (
      !window.confirm(
        "Cancel this inventory adjustment? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await cancelInventoryAdjustment(id);
      setAdjustment(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel inventory adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading adjustment...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!adjustment) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/adjustments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Adjustments
          </Link>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p className="font-semibold">Unable to load inventory adjustment</p>

            <p className="mt-1">{error || "Adjustment not found."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasDifference = adjustment.items.some((item) => item.difference !== 0);

  const isDraft = adjustment.status === "DRAFT";
  const isCounted = adjustment.status === "COUNTED";
  const isForApproval = adjustment.status === "FOR_APPROVAL";

  const canPost =
    adjustment.status === "CONFIRMED" || adjustment.status === "APPROVED";

  const canCancel =
    adjustment.status !== "POSTED" &&
    adjustment.status !== "CANCELLED" &&
    adjustment.status !== "REJECTED";

  const selectedProductIds = new Set(
    countItems.map((item) => item.productId).filter(Boolean),
  );

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <Link
          href="/adjustments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Adjustments
        </Link>

        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {adjustment.adjustmentNo}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClass(
                  adjustment.status,
                )}`}
              >
                {formatStatus(adjustment.status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Physical stock reconciliation and inventory variance control.
            </p>
          </div>

          {canCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
          ) : null}
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Action failed</p>
              <p className="mt-0.5">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-400 hover:text-rose-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Branch
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {adjustment.branch.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {adjustment.branch.code || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Adjustment Date
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {formatDate(adjustment.adjustmentDate)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Created By
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {adjustment.createdBy?.name ||
                adjustment.createdBy?.username ||
                adjustment.createdBy?.email ||
                "—"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatDate(adjustment.createdAt)}
            </p>
          </div>
        </section>

        {adjustment.notes ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />

              <h2 className="text-sm font-semibold text-slate-950">Notes</h2>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {adjustment.notes}
            </p>
          </section>
        ) : null}

        {isDraft ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />

                <h2 className="text-base font-semibold text-slate-950">
                  Physical Count
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Enter the actual quantities found during the physical count.
              </p>
            </div>

            <div className="space-y-4 p-5">
              {countItems.map((item, index) => {
                const options = products
                  .filter(
                    (product) =>
                      product.id === item.productId ||
                      !selectedProductIds.has(product.id),
                  )
                  .map((product) => ({
                    value: product.id,
                    label: `${product.sku} — ${product.name}`,
                    description: [product.brand, product.model]
                      .filter(Boolean)
                      .join(" • "),
                  }));

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_150px_minmax(0,1fr)_minmax(0,1fr)_44px] lg:items-end">
                      <div className="min-w-0">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Product
                        </label>

                        <SearchableSelect
                          value={item.productId}
                          onChange={(value) =>
                            updateCountItem(index, {
                              productId: value,
                            })
                          }
                          options={options}
                          placeholder={
                            productsLoading
                              ? "Loading products..."
                              : "Select product..."
                          }
                          searchPlaceholder="Search SKU or product..."
                          emptyMessage="No products found."
                          loading={productsLoading}
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`counted-${index}`}
                          className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          Physical Qty
                        </label>

                        <input
                          id={`counted-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          value={item.countedQuantity}
                          onChange={(event) =>
                            updateCountItem(index, {
                              countedQuantity: Number(event.target.value) || 0,
                            })
                          }
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`reason-${index}`}
                          className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          Reason
                        </label>

                        <input
                          id={`reason-${index}`}
                          type="text"
                          maxLength={200}
                          value={item.reason}
                          onChange={(event) =>
                            updateCountItem(index, {
                              reason: event.target.value,
                            })
                          }
                          placeholder="Optional"
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`notes-${index}`}
                          className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          Notes
                        </label>

                        <input
                          id={`notes-${index}`}
                          type="text"
                          maxLength={500}
                          value={item.notes}
                          onChange={(event) =>
                            updateCountItem(index, {
                              notes: event.target.value,
                            })
                          }
                          placeholder="Optional"
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCountItem(index)}
                        disabled={submitting || countItems.length === 1}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Remove product"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={addCountItem}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>

                <button
                  type="button"
                  onClick={handleSaveCount}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Save Physical Count
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {adjustment.items.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />

                <h2 className="text-base font-semibold text-slate-950">
                  Counted Items
                </h2>
              </div>

              <span className="text-sm text-slate-500">
                {adjustment.items.length} item
                {adjustment.items.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Product
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      System
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Physical
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Difference
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Unit Cost
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {adjustment.items.map((item) => {
                    const differenceClass =
                      item.difference > 0
                        ? "text-emerald-600"
                        : item.difference < 0
                          ? "text-rose-600"
                          : "text-slate-500";

                    const differenceLabel =
                      item.difference > 0
                        ? `+${formatNumber(item.difference)}`
                        : formatNumber(item.difference);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.product.sku}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.product.name}
                          </p>

                          {item.reason ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Reason: {item.reason}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {formatNumber(item.systemQuantity)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {formatNumber(item.countedQuantity)}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-bold ${differenceClass}`}
                        >
                          {differenceLabel}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(item.unitCost)}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {isCounted ? (
          <section
            className={`rounded-xl border p-5 ${
              hasDifference
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {hasDifference ? (
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              )}

              <div>
                <p
                  className={`text-sm font-semibold ${
                    hasDifference ? "text-amber-900" : "text-emerald-900"
                  }`}
                >
                  {hasDifference
                    ? "Inventory difference detected"
                    : "No inventory difference detected"}
                </p>

                <p
                  className={`mt-1 text-sm ${
                    hasDifference ? "text-amber-800" : "text-emerald-800"
                  }`}
                >
                  {hasDifference
                    ? "This adjustment must go through approval before posting."
                    : "This adjustment can be confirmed and then posted."}
                </p>

                <button
                  type="button"
                  onClick={hasDifference ? handleSubmit : handleConfirm}
                  disabled={submitting}
                  className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                    hasDifference
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {hasDifference ? (
                    <>
                      <Send className="h-4 w-4" />
                      Submit for Approval
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Count
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isForApproval ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />

              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Awaiting Approval
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  This adjustment contains a variance and requires approval.
                </p>

                {canApprove ? (
                  <div className="mt-4 space-y-4">
                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      rows={3}
                      maxLength={500}
                      placeholder="Rejection reason (required only when rejecting)"
                      disabled={submitting}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-amber-900">
                    Your role cannot approve or reject this adjustment.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {canPost ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Send className="mt-0.5 h-5 w-5 text-blue-600" />

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Ready to Post
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  Posting will update the inventory balance and create the
                  corresponding adjustment movement.
                </p>

                <button
                  type="button"
                  onClick={handlePost}
                  disabled={submitting}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post Adjustment
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {adjustment.status === "POSTED" ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Adjustment Posted
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  Inventory has been updated successfully.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {adjustment.status === "REJECTED" ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-900">
                  Adjustment Rejected
                </p>

                <p className="mt-1 text-sm text-rose-800">
                  {adjustment.rejectionReason ||
                    "No rejection reason provided."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {adjustment.status === "CANCELLED" ? (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-slate-500" />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Adjustment Cancelled
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  This adjustment does not affect inventory.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
