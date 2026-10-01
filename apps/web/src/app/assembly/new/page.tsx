"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createAssembly,
  getBillOfMaterials,
  type BillOfMaterial,
} from "@/features/inventory/assembly-api";

import { getCurrentUser } from "@/lib/auth/session";

import { useSearchParams } from "next/navigation";

function NewAssemblyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bomIdFromUrl = searchParams.get("bomId");

  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [billOfMaterialId, setBillOfMaterialId] = useState("");

  const [quantityProduced, setQuantityProduced] = useState(1);

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("Current Branch");

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        const user = getCurrentUser();

        if (!user) {
          await Promise.resolve();

          if (cancelled) {
            return;
          }

          setError("Your session could not be loaded.");
          setLoading(false);
          return;
        }

        const result = await getBillOfMaterials({
          page: 1,
          limit: 100,
          sortBy: "finishedProduct",
          sortOrder: "asc",
        });

        if (cancelled) {
          return;
        }

        setBranchId(user.branchId ?? "");
        setBranchName(user.branch?.name ?? "Current Branch");
        setBoms(result.items);

        if (
          bomIdFromUrl &&
          result.items.some((bom) => bom.id === bomIdFromUrl)
        ) {
          setBillOfMaterialId(bomIdFromUrl);
        }

        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load BOM records.",
        );
        setLoading(false);
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [bomIdFromUrl]);

  useEffect(() => {
    let cancelled = false;

    async function fetchBoms() {
      setLoading(true);
      setError("");

      try {
        const result = await getBillOfMaterials({
          page: 1,
          limit: 100,
          sortBy: "finishedProduct",
          sortOrder: "asc",
        });

        if (cancelled) {
          return;
        }

        setBoms(result.items);
        if (
          bomIdFromUrl &&
          result.items.some((bom) => bom.id === bomIdFromUrl)
        ) {
          setBillOfMaterialId(bomIdFromUrl);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load BOM records.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchBoms();

    return () => {
      cancelled = true;
    };
  }, [bomIdFromUrl]);

  const selectedBom = useMemo(
    () => boms.find((bom) => bom.id === billOfMaterialId) ?? null,
    [boms, billOfMaterialId],
  );

  const bomOptions: SelectOption[] = boms.map((bom) => ({
    value: bom.id,
    label: bom.product?.name ?? "Unnamed Finished Product",
    description: `${bom.product?.sku ?? "No SKU"} • ${
      bom.items.length
    } component${bom.items.length === 1 ? "" : "s"}`,
  }));

  const componentRequirements =
    selectedBom?.items.map((item) => ({
      ...item,
      requiredQuantity: item.quantity * quantityProduced,
    })) ?? [];

  function handleBomChange(value: string) {
    setBillOfMaterialId(value);
    setError("");
    setSuccessMessage("");
  }

  function decreaseQuantity() {
    setQuantityProduced((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantityProduced((current) => current + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!branchId) {
      setError("Your account does not have an assigned branch.");
      return;
    }

    if (!billOfMaterialId) {
      setError("Please select a bill of materials.");
      return;
    }

    if (!Number.isInteger(quantityProduced) || quantityProduced < 1) {
      setError("Quantity produced must be a whole number of at least 1.");
      return;
    }

    setSubmitting(true);

    try {
      await createAssembly({
        branchId,
        billOfMaterialId,
        quantityProduced,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage(
        `${quantityProduced} ${
          selectedBom?.product?.name ?? "finished product"
        } ${
          quantityProduced === 1 ? "was" : "were"
        } added to inventory successfully.`,
      );

      setQuantityProduced(1);
      setNotes("");

      window.setTimeout(() => {
        router.push("/assembly");
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create assembly.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Back */}
        <Link
          href="/assembly"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assembly
        </Link>

        {/* Header */}
        <section>
          <p className="text-sm font-semibold text-primary">
            Inventory / Assembly
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Assembly
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Produce finished inventory using an existing bill of materials.
          </p>
        </section>

        {/* Error */}
        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create assembly</p>

              <p className="mt-1">{error}</p>
            </div>
          </section>
        )}

        {/* Success */}
        {successMessage && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Assembly created
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {successMessage}
                </p>
              </div>
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Assembly Setup */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Assembly Setup</h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Select the BOM that defines the components required for this
              production run.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Bill of Materials
                </label>

                <SearchableSelect
                  value={billOfMaterialId}
                  onChange={handleBomChange}
                  options={bomOptions}
                  placeholder="Select BOM"
                  searchPlaceholder="Search finished product or SKU..."
                  emptyMessage="No active BOMs found."
                  disabled={loading || submitting}
                  loading={loading}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Production Branch
                </label>

                <div className="mt-2 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {branchName}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Inventory will be updated in this branch
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Finished Product */}
          {selectedBom && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                  <Boxes className="h-5 w-5 text-primary" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Finished Product
                  </p>

                  <p className="mt-1 text-base font-bold text-slate-900">
                    {selectedBom.product.name}
                  </p>

                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {selectedBom.product.sku}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Unit: {selectedBom.product.unit}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Quantity */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Production Quantity
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Enter how many finished units you are producing in this assembly
              run.
            </p>

            <div className="mt-5 max-w-sm">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Quantity Produced
              </label>

              <div className="mt-2 flex h-12 items-center overflow-hidden rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={submitting || quantityProduced <= 1}
                  className="flex h-full w-12 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantityProduced}
                  onChange={(event) =>
                    setQuantityProduced(
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                  disabled={submitting}
                  className="h-full min-w-0 flex-1 border-x border-slate-200 bg-white text-center text-base font-bold text-slate-900 outline-none"
                />

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={submitting}
                  className="flex h-full w-12 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Components */}
          {selectedBom && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Component Consumption
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Based on the selected BOM and production quantity.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Component
                      </th>

                      <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        SKU
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Per Unit
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Required
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {componentRequirements.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.componentProduct.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Unit: {item.componentProduct.unit}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {item.componentProduct.sku}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm text-slate-600">
                            {item.quantity}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900">
                            {item.requiredQuantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <label
              htmlFor="assembly-notes"
              className="text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Notes
            </label>

            <textarea
              id="assembly-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Optional assembly notes..."
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-right text-[11px] text-slate-400">
              {notes.length}/500
            </p>
          </section>

          {/* Inventory Effect */}
          {selectedBom && (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-900">
                Inventory effect
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Creating this assembly will deduct the required component
                quantities from{" "}
                <span className="font-semibold">{branchName}</span> and add{" "}
                <span className="font-semibold">
                  {quantityProduced} {selectedBom.product.name}
                </span>{" "}
                to finished-product inventory.
              </p>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/assembly"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || loading || !billOfMaterialId || !branchId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Assembly...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Assembly
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewAssemblyPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex min-h-96 items-center justify-center">
            <div className="text-sm text-slate-500">Loading assembly...</div>
          </div>
        </AppShell>
      }
    >
      <NewAssemblyContent />
    </Suspense>
  );
}
