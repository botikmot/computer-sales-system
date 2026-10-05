"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Loader2,
  Package,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import { getProducts, type Product } from "@/features/products/products-api";

import {
  getInventoryValuation,
  type InventoryValuationResponse,
} from "@/features/reports/reports-api";

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

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryCard({
  label,
  value,
  icon,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
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

export default function InventoryValuationReportPage() {
  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [report, setReport] = useState<InventoryValuationResponse | null>(null);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
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
            sortBy: "name",
            sortOrder: "asc",
          }),
        ]);

        if (cancelled) {
          return;
        }

        setBranches(branchResult);
        setProducts(productResult.items);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setBranches([]);
        setProducts([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load branch and product filters.",
        );
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadValuation() {
      setLoading(true);

      try {
        const result = await getInventoryValuation({
          branchId: branchId || undefined,
          productId: productId || undefined,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setReport(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inventory valuation.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadValuation();

    return () => {
      cancelled = true;
    };
  }, [branchId, productId, refreshKey]);

  const branchOptions: SelectOption[] = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        description: branch.code,
      })),
    [branches],
  );

  const productOptions: SelectOption[] = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.name,
        description: `${product.sku} • ${product.unit}`,
      })),
    [products],
  );

  const branchNames = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.name]));
  }, [branches]);

  const branchCodes = useMemo(() => {
    return new Map(branches.map((branch) => [branch.id, branch.code]));
  }, [branches]);

  const items = report?.items ?? [];

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              Inventory Reports
            </span>

            <span className="text-slate-300">/</span>

            <span className="text-sm text-slate-500">Inventory Valuation</span>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Inventory Valuation
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              View the current inventory quantity, average cost, and total
              inventory value by product and branch.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Branch
              </label>

              <SearchableSelect
                value={branchId}
                onChange={setBranchId}
                options={branchOptions}
                placeholder="All branches"
                searchPlaceholder="Search branches..."
                emptyMessage="No branches found."
                loading={optionsLoading}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Product
              </label>

              <SearchableSelect
                value={productId}
                onChange={setProductId}
                options={productOptions}
                placeholder="All products"
                searchPlaceholder="Search products..."
                emptyMessage="No products found."
                loading={optionsLoading}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Valuation basis:
              </span>{" "}
              Current inventory balance using average cost.
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || optionsLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* ERROR */}
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load report</p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Valuation Items"
            value={formatNumber(report?.count ?? 0)}
            icon={<Package className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Quantity"
            value={formatNumber(report?.totalQuantity ?? 0)}
            icon={<Boxes className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Inventory Value"
            value={formatCurrency(report?.totalValue ?? 0)}
            icon={<WalletCards className="h-4 w-4" />}
            valueClassName="text-primary"
          />
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">
              Inventory Valuation Detail
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current inventory balance valued using the recorded average cost
              for each product.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading inventory valuation...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Boxes className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No inventory records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No inventory balances match the selected branch and product
                filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Branch</TableHeader>
                    <TableHeader align="right">Quantity</TableHeader>
                    <TableHeader align="right">Average Cost</TableHeader>
                    <TableHeader align="right">Inventory Value</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr
                      key={`${item.branchId}-${item.productId}`}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                        {item.sku}
                      </td>

                      <td className="min-w-[260px] px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.productName}
                        </p>
                      </td>

                      <td className="min-w-[180px] px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {branchNames.get(item.branchId) ?? "Unknown branch"}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {branchCodes.get(item.branchId) ?? "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                        {formatNumber(item.quantity)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                        {formatCurrency(item.averageCost)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-950">
                        {formatCurrency(item.inventoryValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t border-slate-200 bg-slate-50/70">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-4 text-sm font-bold text-slate-900"
                    >
                      Total
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {formatNumber(report?.totalQuantity ?? 0)}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-500">
                      —
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-primary">
                      {formatCurrency(report?.totalValue ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
