"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  //CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  Plus,
  Save,
  //UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createSupplierQuotation,
  type CreateSupplierQuotationPayload,
} from "@/features/purchasing/supplier-quotations-api";

import {
  getPurchaseRequests,
  getPurchaseRequest,
} from "@/features/purchasing/purchase-requests-api";

import { getSuppliers, getSupplier } from "@/features/purchasing/suppliers-api";

type PurchaseRequest = Awaited<ReturnType<typeof getPurchaseRequest>>;
type Supplier = Awaited<ReturnType<typeof getSupplier>>;

type FormItem = {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: string;
  notes?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function SupplierQuotationForm() {
  const router = useRouter();

  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    [],
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [selectedPurchaseRequestId, setSelectedPurchaseRequestId] =
    useState("");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const [purchaseRequest, setPurchaseRequest] =
    useState<PurchaseRequest | null>(null);

  const [items, setItems] = useState<FormItem[]>([]);

  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [validUntil, setValidUntil] = useState("");

  const [notes, setNotes] = useState("");

  const [loadingReferences, setLoadingReferences] = useState(true);

  const [loadingPurchaseRequest, setLoadingPurchaseRequest] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [fieldError, setFieldError] = useState("");

  /*
   * Load approved purchase requests + active suppliers.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadReferences() {
      try {
        setLoadingReferences(true);
        setError("");

        const [purchaseRequestResult, supplierResult] = await Promise.all([
          getPurchaseRequests({
            page: 1,
            limit: 100,
            status: "APPROVED",
            sortBy: "createdAt",
            sortOrder: "desc",
          }),
          getSuppliers({
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

        setPurchaseRequests(purchaseRequestResult.data);
        setSuppliers(supplierResult.data);

        setLoadingReferences(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchasing references.",
        );

        setLoadingReferences(false);
      }
    }

    void loadReferences();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load the complete selected purchase request.
   *
   * The dropdown result is enough for selection, but the dedicated
   * GET /purchase-requests/:id gives us the authoritative branch/items.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedPurchaseRequest() {
      if (!selectedPurchaseRequestId) {
        setPurchaseRequest(null);
        setItems([]);
        return;
      }

      try {
        setLoadingPurchaseRequest(true);
        setFieldError("");

        const result = await getPurchaseRequest(selectedPurchaseRequestId);

        if (cancelled) {
          return;
        }

        setPurchaseRequest(result);

        setItems(
          result.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            unit: item.product.unit,
            quantity: item.quantity,
            unitCost: "",
            notes: item.notes,
          })),
        );

        setLoadingPurchaseRequest(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setPurchaseRequest(null);
        setItems([]);

        setFieldError(
          err instanceof Error
            ? err.message
            : "Unable to load the selected purchase request.",
        );

        setLoadingPurchaseRequest(false);
      }
    }

    void loadSelectedPurchaseRequest();

    return () => {
      cancelled = true;
    };
  }, [selectedPurchaseRequestId]);

  const purchaseRequestOptions: SelectOption[] = useMemo(
    () =>
      purchaseRequests.map((request) => ({
        value: request.id,
        label: request.requestNo,
        description: [request.purpose || "No purpose", request.branch?.name]
          .filter(Boolean)
          .join(" • "),
      })),
    [purchaseRequests],
  );

  const supplierOptions: SelectOption[] = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
        description: [supplier.code, supplier.contactPerson]
          .filter(Boolean)
          .join(" • "),
      })),
    [suppliers],
  );

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitCost) ||
        quantity <= 0 ||
        unitCost < 0
      ) {
        return total;
      }

      return total + quantity * unitCost;
    }, 0);
  }, [items]);

  function handleQuantityChange(index: number, value: string) {
    const quantity = Number(value);

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity:
                value === ""
                  ? 0
                  : Number.isFinite(quantity)
                    ? Math.max(0, Math.floor(quantity))
                    : 0,
            }
          : item,
      ),
    );
  }

  function handleUnitCostChange(index: number, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              unitCost: value,
            }
          : item,
      ),
    );
  }

  function handleRemoveItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function handleRestoreAllItems() {
    if (!purchaseRequest) {
      return;
    }

    setItems(
      purchaseRequest.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        unit: item.product.unit,
        quantity: item.quantity,
        unitCost: "",
        notes: item.notes,
      })),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFieldError("");

    if (!selectedPurchaseRequestId) {
      setFieldError("Please select an approved purchase request.");
      return;
    }

    if (!selectedSupplierId) {
      setFieldError("Please select a supplier.");
      return;
    }

    if (!purchaseRequest) {
      setFieldError("Unable to determine the selected purchase request.");
      return;
    }

    if (purchaseRequest.status !== "APPROVED") {
      setFieldError(
        "Only approved purchase requests can receive supplier quotations.",
      );
      return;
    }

    if (items.length === 0) {
      setFieldError("Add at least one quotation item.");
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity < 1) {
        setFieldError(`${item.productName}: quantity must be at least 1.`);
        return;
      }

      if (item.unitCost.trim() === "") {
        setFieldError(
          `${item.productName}: please enter the supplier unit cost.`,
        );
        return;
      }

      const unitCost = Number(item.unitCost);

      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setFieldError(
          `${item.productName}: unit cost must be a valid non-negative amount.`,
        );
        return;
      }

      if (!Number.isInteger(item.quantity)) {
        setFieldError(`${item.productName}: quantity must be a whole number.`);
        return;
      }
    }

    const payload: CreateSupplierQuotationPayload = {
      branchId: purchaseRequest.branchId,
      supplierId: selectedSupplierId,
      purchaseRequestId: purchaseRequest.id,
      quotationDate: quotationDate || undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
      })),
    };

    try {
      setSubmitting(true);

      const created = await createSupplierQuotation(payload);

      router.push(`/supplier-quotations/${created.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create supplier quotation.",
      );
      setSubmitting(false);
    }
  }

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

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Supplier Quotation
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create a supplier quotation against an approved purchase request.
            </p>
          </div>
        </section>

        {/* LOADING REFERENCES */}
        {loadingReferences && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading approved purchase requests and suppliers...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to continue</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC DETAILS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <SectionHeader
              icon={<FileText className="h-5 w-5" />}
              title="Quotation Details"
              description="Select the approved purchase request and supplier."
            />

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
              <Field label="Purchase Request" required>
                <SearchableSelect
                  value={selectedPurchaseRequestId}
                  onChange={setSelectedPurchaseRequestId}
                  options={purchaseRequestOptions}
                  placeholder="Select approved purchase request"
                  searchPlaceholder="Search purchase request..."
                  emptyMessage="No approved purchase requests found."
                  disabled={
                    loadingReferences || loadingPurchaseRequest || submitting
                  }
                />
              </Field>

              <Field label="Supplier" required>
                <SearchableSelect
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  options={supplierOptions}
                  placeholder="Select supplier"
                  searchPlaceholder="Search supplier..."
                  emptyMessage="No active suppliers found."
                  disabled={loadingReferences || submitting}
                />
              </Field>

              <Field label="Quotation Date">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(event) => setQuotationDate(event.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                  />
                </div>
              </Field>

              <Field label="Valid Until">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="date"
                    value={validUntil}
                    min={quotationDate || undefined}
                    onChange={(event) => setValidUntil(event.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* PURCHASE REQUEST CONTEXT */}
          {purchaseRequest && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <SectionHeader
                icon={<ClipboardList className="h-5 w-5" />}
                title="Purchase Request"
                description="Reference information from the selected approved request."
              />

              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCell
                  label="Request No."
                  value={purchaseRequest.requestNo}
                  href={`/purchase-requests/${purchaseRequest.id}`}
                />

                <InfoCell
                  label="Branch"
                  value={
                    purchaseRequest.branch
                      ? `${purchaseRequest.branch.name} (${purchaseRequest.branch.code})`
                      : "—"
                  }
                  icon={<Building2 className="h-4 w-4" />}
                />

                <InfoCell
                  label="Purpose"
                  value={purchaseRequest.purpose || "—"}
                />

                <InfoCell
                  label="Items"
                  value={String(purchaseRequest.items.length)}
                  icon={<Package className="h-4 w-4" />}
                />
              </div>

              {purchaseRequest.notes && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Request Notes
                  </p>

                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {purchaseRequest.notes}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* FIELD ERROR */}
          {fieldError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Please review the form</p>
                <p className="mt-0.5">{fieldError}</p>
              </div>
            </div>
          )}

          {/* ITEMS */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <SectionHeader
              icon={<Package className="h-5 w-5" />}
              title="Quotation Items"
              description="Quote the products requested in the purchase request."
              action={
                purchaseRequest && items.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleRestoreAllItems}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Restore Items
                  </button>
                ) : undefined
              }
            />

            {loadingPurchaseRequest ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading purchase request items...
                </div>
              </div>
            ) : !selectedPurchaseRequestId ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ClipboardList className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  Select a purchase request
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Choose an approved purchase request above to load its
                  requested products.
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Package className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  No quotation items
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Restore the purchase request items to continue.
                </p>

                <button
                  type="button"
                  onClick={handleRestoreAllItems}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Restore All Items
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <TableHeader>Product</TableHeader>
                        <TableHeader>SKU</TableHeader>
                        <TableHeader align="right">Quantity</TableHeader>
                        <TableHeader align="right">Unit Cost</TableHeader>
                        <TableHeader align="right">Subtotal</TableHeader>
                        <TableHeader align="right">Action</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => {
                        const quantity = Number(item.quantity);
                        const unitCost = Number(item.unitCost);

                        const lineSubtotal =
                          Number.isFinite(quantity) &&
                          Number.isFinite(unitCost) &&
                          quantity > 0 &&
                          unitCost >= 0
                            ? quantity * unitCost
                            : 0;

                        return (
                          <tr
                            key={item.productId}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {item.productName}
                              </p>

                              {item.notes && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {item.notes}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-semibold text-slate-600">
                                {item.sku}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity || ""}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    index,
                                    event.target.value,
                                  )
                                }
                                disabled={submitting}
                                className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                              />

                              <p className="mt-1 text-xs text-slate-400">
                                {item.unit}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="relative ml-auto w-32">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                  ₱
                                </span>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(event) =>
                                    handleUnitCostChange(
                                      index,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  disabled={submitting}
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-right text-sm text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                                />
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(lineSubtotal)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                disabled={submitting}
                                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* TOTAL */}
                <div className="border-t border-slate-100 bg-slate-50/50">
                  <div className="ml-auto max-w-sm px-5 py-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-500">
                        Quotation Total
                      </span>

                      <span className="text-lg font-bold text-slate-950">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* NOTES */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <SectionHeader
              icon={<FileText className="h-5 w-5" />}
              title="Notes"
              description="Optional additional quotation information."
            />

            <div className="px-5 py-5">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Add quotation notes, supplier terms, delivery information, or other details..."
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
              />

              <p className="mt-1.5 text-right text-xs text-slate-400">
                {notes.length}/2000
              </p>
            </div>
          </section>

          {/* ACTIONS */}
          <section className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/supplier-quotations"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingReferences ||
                loadingPurchaseRequest ||
                !purchaseRequest ||
                items.length === 0
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create Supplier Quotation
            </button>
          </section>
        </form>
      </div>
    </AppShell>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>

          {description && (
            <p className="text-xs text-slate-400">{description}</p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function InfoCell({
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
    <div className="border-b border-slate-100 px-5 py-4">
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
