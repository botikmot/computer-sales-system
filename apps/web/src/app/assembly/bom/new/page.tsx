"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createBillOfMaterial,
  type CreateBomItemPayload,
} from "@/features/inventory/assembly-api";

import {
  getProducts,
  type Product,
  type ProductListResponse,
} from "@/features/products/products-api";

type ComponentRow = {
  rowId: string;
  productId: string;
  quantity: number;
};

function createRow(rowId: string): ComponentRow {
  return {
    rowId,
    productId: "",
    quantity: 1,
  };
}

export default function NewBomPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [finishedProductId, setFinishedProductId] = useState("");

  const [components, setComponents] = useState<ComponentRow[]>([
    createRow("1"),
  ]);

  const [loadingProducts, setLoadingProducts] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      setLoadingProducts(true);
      setError("");

      try {
        const result: ProductListResponse = await getProducts({
          page: 1,
          limit: 100,
          isActive: true,
          sortBy: "name",
          sortOrder: "asc",
        });

        if (cancelled) {
          return;
        }

        setProducts(result.items.filter((product) => product.trackInventory));
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load products.",
        );
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const finishedProduct = products.find(
    (product) => product.id === finishedProductId,
  );

  const finishedProductOptions: SelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${product.sku} • ${product.unit}`,
  }));

  const selectedComponentIds = components
    .map((component) => component.productId)
    .filter((productId): productId is string => Boolean(productId));

  function getComponentOptions(currentProductId: string): SelectOption[] {
    return products
      .filter(
        (product) =>
          product.id !== finishedProductId &&
          (!selectedComponentIds.includes(product.id) ||
            product.id === currentProductId),
      )
      .map((product) => ({
        value: product.id,
        label: product.name,
        description: `${product.sku} • ${product.unit}`,
      }));
  }

  function handleFinishedProductChange(value: string) {
    setFinishedProductId(value);
    setError("");
    setSuccessMessage("");

    setComponents((current) =>
      current.map((component) =>
        component.productId === value
          ? {
              ...component,
              productId: "",
            }
          : component,
      ),
    );
  }

  function handleComponentChange(rowId: string, productId: string) {
    setError("");
    setSuccessMessage("");

    setComponents((current) =>
      current.map((component) =>
        component.rowId === rowId
          ? {
              ...component,
              productId,
            }
          : component,
      ),
    );
  }

  function updateQuantity(rowId: string, quantity: number) {
    setComponents((current) =>
      current.map((component) =>
        component.rowId === rowId
          ? {
              ...component,
              quantity: Math.max(1, Number.isFinite(quantity) ? quantity : 1),
            }
          : component,
      ),
    );
  }

  function addComponent() {
    setComponents((current) => [...current, createRow(String(Date.now()))]);
  }

  function removeComponent(rowId: string) {
    setComponents((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((component) => component.rowId !== rowId);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!finishedProductId) {
      setError("Please select a finished product.");
      return;
    }

    if (components.length === 0) {
      setError("Please add at least one component.");
      return;
    }

    const incompleteComponent = components.find(
      (component) => !component.productId,
    );

    if (incompleteComponent) {
      setError("Please select a product for every component row.");
      return;
    }

    const invalidQuantity = components.find(
      (component) =>
        !Number.isInteger(component.quantity) || component.quantity < 1,
    );

    if (invalidQuantity) {
      setError("Component quantities must be whole numbers of at least 1.");
      return;
    }

    const componentIds = components.map((component) => component.productId);

    const hasDuplicateComponents =
      new Set(componentIds).size !== componentIds.length;

    if (hasDuplicateComponents) {
      setError(
        "A component product can only appear once. Increase its quantity instead.",
      );
      return;
    }

    if (componentIds.includes(finishedProductId)) {
      setError(
        "The finished product cannot also be one of its own components.",
      );
      return;
    }

    const items: CreateBomItemPayload[] = components.map((component) => ({
      componentProductId: component.productId,
      quantity: component.quantity,
    }));

    setSubmitting(true);

    try {
      const created = await createBillOfMaterial({
        finishedProductId,
        items,
      });

      setSuccessMessage(
        `BOM created for ${created.product?.name ?? "the finished product"}.`,
      );

      router.push(`/assembly/bom/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create BOM.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Back */}
        <Link
          href="/assembly/bom"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to BOM Setup
        </Link>

        {/* Header */}
        <section>
          <p className="text-sm font-semibold text-primary">
            Inventory / Assembly
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Bill of Materials
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Define the components required to produce one finished product.
          </p>
        </section>

        {/* Alerts */}
        {successMessage && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          </section>
        )}

        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create BOM</p>

              <p className="mt-1">{error}</p>
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Finished Product */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Finished Product</h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              This is the product that will be added to inventory after
              assembly.
            </p>

            <div className="mt-5 max-w-2xl">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Product
              </label>

              <SearchableSelect
                value={finishedProductId}
                onChange={handleFinishedProductChange}
                options={finishedProductOptions}
                placeholder="Select finished product"
                searchPlaceholder="Search product or SKU..."
                emptyMessage="No active inventory-tracked products found."
                disabled={loadingProducts || submitting}
                loading={loadingProducts}
                className="mt-2"
              />
            </div>

            {finishedProduct && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  {finishedProduct.name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-500">
                  {finishedProduct.sku}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Unit: {finishedProduct.unit}
                </p>
              </div>
            )}
          </section>

          {/* Components */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">Components</h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Specify the quantity of each component required for one
                  finished product.
                </p>
              </div>

              <button
                type="button"
                onClick={addComponent}
                disabled={submitting || loadingProducts}
                className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Component
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {components.map((component, index) => (
                <div key={component.rowId} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Component {index + 1}
                    </p>

                    {components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComponent(component.rowId)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Product
                      </label>

                      <SearchableSelect
                        value={component.productId}
                        onChange={(value) =>
                          handleComponentChange(component.rowId, value)
                        }
                        options={getComponentOptions(component.productId)}
                        placeholder="Select component"
                        searchPlaceholder="Search product or SKU..."
                        emptyMessage={
                          finishedProductId
                            ? "No available component products found."
                            : "Select a finished product first."
                        }
                        disabled={
                          loadingProducts || submitting || !finishedProductId
                        }
                        loading={loadingProducts}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`quantity-${component.rowId}`}
                        className="text-xs font-bold uppercase tracking-wide text-slate-500"
                      >
                        Quantity
                      </label>

                      <div className="mt-2 flex h-10 items-center overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              component.rowId,
                              component.quantity - 1,
                            )
                          }
                          disabled={submitting || component.quantity <= 1}
                          className="flex h-full w-10 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <input
                          id={`quantity-${component.rowId}`}
                          type="number"
                          min={1}
                          step={1}
                          value={component.quantity}
                          onChange={(event) =>
                            updateQuantity(
                              component.rowId,
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                          className="h-full min-w-0 flex-1 border-x border-slate-200 bg-white text-center text-sm font-semibold text-slate-800 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              component.rowId,
                              component.quantity + 1,
                            )
                          }
                          disabled={submitting}
                          className="flex h-full w-10 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Component Summary */}
            <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Components defined
                </span>

                <span className="text-sm font-semibold text-slate-800">
                  {components.filter((component) => component.productId).length}
                </span>
              </div>
            </div>
          </section>

          {/* Process Info */}
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              Assembly inventory behavior
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              When an assembly is posted, the selected component quantities will
              be deducted from inventory and the finished product quantity will
              be added to inventory.
            </p>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/assembly/bom"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || loadingProducts || !finishedProductId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating BOM...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create BOM
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
