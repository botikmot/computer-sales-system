"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getAssembly, type Assembly } from "@/features/inventory/assembly-api";

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function getStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getMovementClass(quantityChange: number) {
  return quantityChange >= 0
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";
}

export default function AssemblyDetailPage() {
  const params = useParams();

  const assemblyId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [assembly, setAssembly] = useState<Assembly | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!assemblyId) {
      return;
    }

    let cancelled = false;

    async function fetchAssembly() {
      try {
        const result = await getAssembly(assemblyId);

        if (cancelled) {
          return;
        }

        setAssembly(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load assembly details.",
        );
        setLoading(false);
      }
    }

    void fetchAssembly();

    return () => {
      cancelled = true;
    };
  }, [assemblyId]);

  if (!assemblyId) {
    return (
      <AppShell>
        <div className="space-y-6 pb-10">
          <Link
            href="/assembly"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assembly
          </Link>

          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Invalid Assembly</p>

              <p className="mt-1">No assembly ID was provided in the route.</p>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-96 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assembly details...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !assembly) {
    return (
      <AppShell>
        <div className="space-y-6 pb-10">
          <Link
            href="/assembly"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assembly
          </Link>

          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load assembly</p>

              <p className="mt-1">{error || "Assembly not found."}</p>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  const totalConsumedUnits = assembly.components.reduce(
    (sum, component) => sum + component.quantityConsumed,
    0,
  );

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
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/assembly"
                className="text-sm font-semibold text-slate-400 transition hover:text-primary"
              >
                Assembly
              </Link>

              <span className="text-slate-300">/</span>

              <span className="text-sm font-semibold text-primary">
                Details
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Assembly Details
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review the production result and inventory movements for this
              assembly.
            </p>
          </div>

          <span
            className={[
              "inline-flex self-start rounded-full px-3 py-1.5 text-[11px] font-bold lg:self-auto",
              getStatusClass(assembly.status),
            ].join(" ")}
          >
            {assembly.status}
          </span>
        </section>

        {/* Production Summary */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Finished Product
              </p>
            </div>

            <p className="mt-3 text-base font-bold text-slate-950">
              {assembly.finishedProduct?.name ?? "—"}
            </p>

            <p className="mt-1 font-mono text-xs text-slate-500">
              {assembly.finishedProduct?.sku ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Quantity Produced
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {formatNumber(assembly.quantityProduced)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Finished units added to inventory
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-rose-500" />

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Components Consumed
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {formatNumber(totalConsumedUnits)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Total component units deducted
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Production Date
              </p>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-900">
              {formatDate(assembly.createdAt)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {assembly.branch?.name ?? "Current Branch"}
            </p>
          </div>
        </section>

        {/* Finished Product + BOM */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                <Package className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Output
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950">
                  {assembly.finishedProduct?.name ?? "—"}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-500">
                  {assembly.finishedProduct?.sku ?? "—"}
                </p>

                <p className="mt-3 text-sm text-blue-700">
                  Inventory output:{" "}
                  <span className="font-bold">
                    +{formatNumber(assembly.quantityProduced)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">BOM Used</h2>
            </div>

            <p className="mt-3 text-base font-semibold text-slate-900">
              {assembly.billOfMaterial?.name ||
                assembly.billOfMaterial?.product?.name ||
                "—"}
            </p>

            <p className="mt-1 font-mono text-xs text-slate-400">
              {assembly.billOfMaterial?.product?.sku ?? "—"}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              {assembly.billOfMaterial?.items?.length ?? 0} component
              {(assembly.billOfMaterial?.items?.length ?? 0) === 1
                ? ""
                : "s"}{" "}
              defined in the BOM.
            </p>
          </div>
        </section>

        {/* Components Consumed */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-rose-500" />

              <h2 className="font-semibold text-slate-950">
                Components Consumed
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Actual component quantities deducted by this assembly.
            </p>
          </div>

          {assembly.components.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-sm text-slate-400">
              No component consumption records found.
            </div>
          ) : (
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
                      Per Finished Unit
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Consumed
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {assembly.components.map((component) => {
                    const bomItem = assembly.billOfMaterial?.items?.find(
                      (item) =>
                        item.componentProductId ===
                        component.componentProductId,
                    );

                    return (
                      <tr
                        key={component.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {component.componentProduct?.name}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {component.componentProduct?.sku}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-600">
                          {bomItem?.quantity ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                            -{formatNumber(component.quantityConsumed)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Inventory Movements */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Inventory Movements
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Inventory ledger movements generated by this assembly.
            </p>
          </div>

          {!assembly.inventoryMovements?.length ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-sm text-slate-400">
              No inventory movements found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Movement
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Balance After
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Unit Cost
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Total Cost
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {assembly.inventoryMovements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {movement.quantityChange >= 0 ? (
                            <ArrowUp className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-rose-600" />
                          )}

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {movement.type}
                            </p>

                            <span
                              className={[
                                "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                                getMovementClass(movement.quantityChange),
                              ].join(" ")}
                            >
                              ASSEMBLY
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={[
                            "text-sm font-bold",
                            movement.quantityChange >= 0
                              ? "text-emerald-700"
                              : "text-rose-700",
                          ].join(" ")}
                        >
                          {movement.quantityChange >= 0 ? "+" : ""}
                          {formatNumber(movement.quantityChange)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                        {formatNumber(movement.balanceAfter ?? 0)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-500">
                        {movement.unitCost !== null &&
                        movement.unitCost !== undefined
                          ? Number(movement.unitCost).toLocaleString("en-PH", {
                              style: "currency",
                              currency: "PHP",
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-500">
                        {movement.totalCost !== null &&
                        movement.totalCost !== undefined
                          ? Number(movement.totalCost).toLocaleString("en-PH", {
                              style: "currency",
                              currency: "PHP",
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-500">
                        {formatDate(movement.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Notes */}
        {assembly.notes && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Notes</h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {assembly.notes}
            </p>
          </section>
        )}

        {/* Success State */}
        {assembly.status === "COMPLETED" && (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Assembly completed
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  {formatNumber(assembly.quantityProduced)} finished unit
                  {assembly.quantityProduced === 1 ? "" : "s"}{" "}
                  {assembly.finishedProduct?.name}{" "}
                  {assembly.quantityProduced === 1 ? "was" : "were"} added to
                  inventory.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
