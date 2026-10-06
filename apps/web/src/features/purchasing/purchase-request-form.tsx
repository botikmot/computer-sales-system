"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createPurchaseRequest,
  type CreatePurchaseRequestPayload,
} from "./purchase-requests-api";

import { getBranches, type Branch } from "@/features/branches/branches-api";
import { getProducts, type Product } from "@/features/products/products-api";

type PurchaseRequestFormProps = {
  onSuccess: (requestId: string) => void;
  onCancel: () => void;
};

type FormItem = {
  localId: string;
  productId: string;
  quantity: string;
  notes: string;
};

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inputClassName() {
  return [
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3",
    "text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
  ].join(" ");
}

function textareaClassName() {
  return [
    "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5",
    "text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
  ].join(" ");
}

function createEmptyItem(): FormItem {
  return {
    localId: createLocalId(),
    productId: "",
    quantity: "1",
    notes: "",
  };
}

export function PurchaseRequestForm({
  onSuccess,
  onCancel,
}: PurchaseRequestFormProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [branchId, setBranchId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<FormItem[]>([createEmptyItem()]);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [branchResult, productResult] = await Promise.all([
          getBranches(),
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

        const activeBranches = branchResult.filter((branch) => branch.isActive);

        setBranches(activeBranches);
        setProducts(productResult.items);

        if (activeBranches.length === 1) {
          setBranchId(activeBranches[0].id);
        }

        setLoadingOptions(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load branches and products.",
        );

        setLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchOptions = useMemo<SelectOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: `${branch.code} — ${branch.name}`,
        description: branch.address ?? "Active branch",
      })),
    [branches],
  );

  const selectedProductIds = useMemo(() => {
    return new Set(items.map((item) => item.productId).filter(Boolean));
  }, [items]);

  function getProductOptions(currentProductId: string): SelectOption[] {
    return products.map((product) => {
      const alreadySelected =
        selectedProductIds.has(product.id) && product.id !== currentProductId;

      return {
        value: product.id,
        label: `${product.sku} — ${product.name}`,
        description: [
          product.brand,
          product.model,
          product.unit ? `Unit: ${product.unit}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        disabled: alreadySelected,
      };
    });
  }

  function updateItem(
    localId: string,
    field: keyof Omit<FormItem, "localId">,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(localId: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.localId !== localId);
    });
  }

  function validateForm(): string | null {
    if (!branchId) {
      return "Please select a branch.";
    }

    if (items.length === 0) {
      return "At least one item is required.";
    }

    const seenProducts = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const rowNumber = index + 1;

      if (!item.productId) {
        return `Please select a product for item ${rowNumber}.`;
      }

      if (seenProducts.has(item.productId)) {
        return `Product is duplicated in item ${rowNumber}. Each product can only appear once.`;
      }

      seenProducts.add(item.productId);

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return `Quantity for item ${rowNumber} must be at least 1.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: CreatePurchaseRequestPayload = {
      branchId,
      purpose: purpose.trim() || undefined,
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        notes: item.notes.trim() || undefined,
      })),
    };

    try {
      const request = await createPurchaseRequest(payload);

      onSuccess(request.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create purchase request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading branches and products...
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]"
    >
      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 lg:col-span-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

            <div>
              <p className="text-sm font-semibold text-rose-800">
                Please check the form
              </p>

              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Information */}
      <section className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Request Information
              </p>

              <p className="text-xs text-slate-400">
                Specify the branch and reason for the purchase request.
              </p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-5 p-5">
          {/* Branch */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Branch
              <span className="ml-1 text-rose-500">*</span>
            </label>

            <SearchableSelect
              value={branchId}
              onChange={setBranchId}
              options={branchOptions}
              placeholder="Select branch"
              searchPlaceholder="Search branches..."
              emptyMessage="No active branches found."
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Purpose
            </label>

            <input
              type="text"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              maxLength={500}
              placeholder="e.g. Stock replenishment"
              className={inputClassName()}
            />
          </div>

          {/* Request Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Request Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              placeholder="Add additional context or instructions..."
              className={textareaClassName()}
            />
          </div>
        </div>
      </section>

      {/* Requested Items */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Requested Items
              </p>

              <p className="text-xs text-slate-400">
                Add the products and quantities needed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {/* Items */}
        <div className="space-y-3 p-4 sm:p-5">
          {items.map((item, index) => (
            <div
              key={item.localId}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4"
            >
              {/* Item header */}
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Item {index + 1}
                </p>
              </div>

              {/* Product / Quantity / Remove */}
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_auto]">
                {/* Product */}
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Product
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <SearchableSelect
                    value={item.productId}
                    onChange={(value) =>
                      updateItem(item.localId, "productId", value)
                    }
                    options={getProductOptions(item.productId)}
                    placeholder="Select product"
                    searchPlaceholder="Search SKU or product..."
                    emptyMessage="No active products found."
                    disabled={submitting}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Quantity
                    <span className="ml-1 text-rose-500">*</span>
                  </label>

                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.localId, "quantity", event.target.value)
                    }
                    disabled={submitting}
                    className={inputClassName()}
                  />
                </div>

                {/* Remove */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    disabled={submitting || items.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="lg:hidden">Remove Item</span>
                    <span className="hidden lg:inline">Remove</span>
                  </button>
                </div>

                {/* Item Notes */}
                <div className="lg:col-span-3">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Item Notes
                  </label>

                  <input
                    type="text"
                    value={item.notes}
                    onChange={(event) =>
                      updateItem(item.localId, "notes", event.target.value)
                    }
                    maxLength={500}
                    disabled={submitting}
                    placeholder="Optional note for this item..."
                    className={inputClassName()}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
          <p className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? "product" : "products"}{" "}
            requested
          </p>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {submitting ? "Creating Request..." : "Create Purchase Request"}
        </button>
      </div>
    </form>
  );
}
