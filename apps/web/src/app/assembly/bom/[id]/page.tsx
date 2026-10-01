"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getBillOfMaterial,
  type BillOfMaterial,
} from "@/features/inventory/assembly-api";

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

function getStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

export default function BomDetailPage() {
  const params = useParams();

  const bomId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [bom, setBom] = useState<BillOfMaterial | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!bomId) {
      return;
    }

    let cancelled = false;

    async function fetchBom() {
      try {
        const result = await getBillOfMaterial(bomId);

        if (cancelled) {
          return;
        }

        setBom(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load BOM details.",
        );
        setLoading(false);
      }
    }

    void fetchBom();

    return () => {
      cancelled = true;
    };
  }, [bomId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-96 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading BOM details...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!bomId) {
    return (
      <AppShell>
        <div className="space-y-6 pb-10">
          <Link
            href="/assembly/bom"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to BOM Setup
          </Link>

          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Invalid BOM</p>

              <p className="mt-1">No BOM ID was provided in the route.</p>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  if (error || !bom) {
    return (
      <AppShell>
        <div className="space-y-6 pb-10">
          <Link
            href="/assembly/bom"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to BOM Setup
          </Link>

          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load BOM</p>

              <p className="mt-1">{error || "BOM not found."}</p>
            </div>
          </section>
        </div>
      </AppShell>
    );
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

              <Link
                href="/assembly/bom"
                className="text-sm font-semibold text-slate-400 transition hover:text-primary"
              >
                BOM Setup
              </Link>

              <span className="text-slate-300">/</span>

              <span className="text-sm font-semibold text-primary">
                Details
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {bom.product?.name ?? "Bill of Materials"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review the components required to produce this finished product.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold",
                getStatusClass(bom.isActive),
              ].join(" ")}
            >
              {bom.isActive ? "ACTIVE" : "INACTIVE"}
            </span>

            {bom.isActive && (
              <Link
                href={`/assembly/new?bomId=${bom.id}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Assembly
              </Link>
            )}
          </div>
        </section>

        {/* Finished Product */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <Package className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Finished Product
              </p>

              <p className="mt-1 text-lg font-bold text-slate-950">
                {bom.product.name}
              </p>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-mono text-xs text-slate-500">
                  {bom.product.sku}
                </span>

                <span className="text-xs text-slate-400">
                  Unit: {bom.product.unit}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BOM Information */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">BOM Information</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  BOM Name
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {bom.name || bom.product.name}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Components
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {bom.items.length}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(bom.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Last Updated
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(bom.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Assembly Explanation */}
          <div className="lg:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Assembly Recipe
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  This BOM defines the component quantities needed to produce
                  one <span className="font-semibold">{bom.product.name}</span>.
                  When an assembly is created, these component quantities are
                  multiplied by the production quantity and deducted from
                  inventory.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Components Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">BOM Components</h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Components required for one finished unit.
            </p>
          </div>

          {bom.items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <Boxes className="h-6 w-6 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No components defined
              </p>

              <p className="mt-1 text-sm text-slate-400">
                This BOM cannot be used for assembly until components are
                defined.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      #
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Component
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Unit
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quantity per Unit
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {bom.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.componentProduct.name}
                        </p>

                        {item.componentProduct.brand && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.componentProduct.brand}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {item.componentProduct.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {item.componentProduct.unit}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900">
                          {item.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Bottom Action */}
        {bom.isActive && bom.items.length > 0 && (
          <section className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Ready for production
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Use this BOM to create an assembly and add finished units to
                inventory.
              </p>
            </div>

            <Link
              href={`/assembly/new?bomId=${bom.id}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create Assembly
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
