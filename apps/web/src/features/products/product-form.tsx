"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Loader2,
  Package,
  Save,
} from "lucide-react";

import type { CreateProductPayload, Product } from "./products-api";

import { getProductCategories, type ProductCategory } from "./categories-api";

type Props = {
  product?: Product | null;
  submitting?: boolean;
  onSubmit: (payload: CreateProductPayload) => Promise<void>;
  onCancel: () => void;
};

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

export function ProductForm({
  product,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = Boolean(product);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [model, setModel] = useState(product?.model ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "pcs");

  const [sellingPrice, setSellingPrice] = useState(
    product?.defaultSellingPrice?.toString() ?? "",
  );

  const [costPrice, setCostPrice] = useState(
    product?.defaultCostPrice?.toString() ?? "",
  );

  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");

  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [trackInventory, setTrackInventory] = useState(
    product?.trackInventory ?? true,
  );

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const result = await getProductCategories();

        if (!cancelled) {
          setCategories(result.items);
          setCategoriesLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setCategories([]);
          setCategoriesLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load product categories.",
          );
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const normalizedSku = sku.trim();
    const normalizedName = name.trim();
    const normalizedUnit = unit.trim() || "pcs";

    if (!normalizedSku) {
      setError("SKU is required.");
      return;
    }

    if (!normalizedName) {
      setError("Product name is required.");
      return;
    }

    const parsedSellingPrice = sellingPrice.trim()
      ? Number(sellingPrice)
      : undefined;

    const parsedCostPrice = costPrice.trim() ? Number(costPrice) : undefined;

    if (
      parsedSellingPrice !== undefined &&
      (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0)
    ) {
      setError("Selling price must be a valid non-negative amount.");
      return;
    }

    if (
      parsedCostPrice !== undefined &&
      (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0)
    ) {
      setError("Cost price must be a valid non-negative amount.");
      return;
    }

    try {
      await onSubmit({
        sku: normalizedSku,
        name: normalizedName,
        description: description.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        unit: normalizedUnit,
        defaultSellingPrice: parsedSellingPrice,
        defaultCostPrice: parsedCostPrice,
        isActive,
        trackInventory,
        categoryId: categoryId || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Unable to update product."
            : "Unable to create product.",
      );
    }
  }

  const availableCategories = categories.filter(
    (category) => category.isActive || category.id === product?.categoryId,
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">Unable to save product</p>

            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Product Information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">
              Product Information
            </h2>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Basic product identification and classification.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="SKU" required>
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="e.g. RAM-DDR4-16"
              className={inputClassName()}
              disabled={submitting}
            />
          </Field>

          <Field label="Product Name" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. 16GB DDR4 RAM"
              className={inputClassName()}
              disabled={submitting}
            />
          </Field>

          <Field label="Brand">
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="e.g. AMD, Intel, Kingston"
              className={inputClassName()}
              disabled={submitting}
            />
          </Field>

          <Field label="Model">
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="e.g. Ryzen 5 5600"
              className={inputClassName()}
              disabled={submitting}
            />
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClassName()}
              disabled={submitting || categoriesLoading}
            >
              <option value="">
                {categoriesLoading ? "Loading categories..." : "No category"}
              </option>

              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.isActive ? " (Inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit">
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="pcs"
              className={inputClassName()}
              disabled={submitting}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional product description..."
                className={textareaClassName()}
                disabled={submitting}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">Pricing</h2>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Default selling and cost prices for this product.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Selling Price">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₱
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                placeholder="0.00"
                className={`${inputClassName()} pl-8`}
                disabled={submitting}
              />
            </div>
          </Field>

          <Field label="Cost Price">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₱
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(event) => setCostPrice(event.target.value)}
                placeholder="0.00"
                className={`${inputClassName()} pl-8`}
                disabled={submitting}
              />
            </div>
          </Field>
        </div>
      </section>

      {/* Inventory / Status */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">Inventory & Status</h2>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Control inventory tracking and product availability.
          </p>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          <ToggleCard
            icon={<Boxes className="h-5 w-5" />}
            title="Track Inventory"
            description="Use inventory balances and stock movements for this product."
            checked={trackInventory}
            onChange={setTrackInventory}
            disabled={submitting}
          />

          <ToggleCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Active Product"
            description="Allow this product to remain available for transactions."
            checked={isActive}
            onChange={setIsActive}
            disabled={submitting}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditing ? "Saving..." : "Creating..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditing ? "Save Changes" : "Create Product"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition",
        checked
          ? "border-primary/20 bg-primary/5"
          : "border-slate-200 bg-slate-50/60",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/30",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          checked
            ? "bg-primary/10 text-primary"
            : "bg-slate-200 text-slate-500",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">{title}</p>

          <span
            className={[
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
              checked ? "bg-primary" : "bg-slate-300",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                checked ? "left-6" : "left-1",
              ].join(" ")}
            />
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
    </button>
  );
}
