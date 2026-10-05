"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
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
  getInventoryLowStock,
  type InventoryLowStockResponse,
} from "@/features/reports/reports-api";

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "₱0.00";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function getQuantityClass(quantity: number, threshold: number) {
  if (quantity === 0) {
    return "bg-red-50 text-red-700";
  }

  if (quantity <= threshold) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getQuantityLabel(quantity: number) {
  if (quantity === 0) {
    return "Out of stock";
  }

  return "Low stock";
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

export default function LowStockReportPage() {
  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");

  const [thresholdInput, setThresholdInput] = useState("5");
  const [threshold, setThreshold] = useState(5);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [report, setReport] = useState<InventoryLowStockResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setOptionsLoading(true);

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

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load branch and product options.",
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

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getInventoryLowStock({
          branchId: branchId || undefined,
          productId: productId || undefined,
          threshold,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load low stock report.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [branchId, productId, threshold, refreshKey]);

  const branchOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: "",
        label: "All branches",
        description: "Show low stock across all branches",
      },
      ...branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        description: branch.code,
      })),
    ],
    [branches],
  );

  const productOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: "",
        label: "All products",
        description: "Show all low stock products",
      },
      ...products.map((product) => ({
        value: product.id,
        label: product.name,
        description: product.sku,
      })),
    ],
    [products],
  );

  const summary = useMemo(() => {
    const items = report?.items ?? [];

    const outOfStock = items.filter((item) => item.quantity === 0).length;

    const inventoryValue = items.reduce(
      (sum, item) => sum + Number(item.inventoryValue),
      0,
    );

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items: items.length,
      outOfStock,
      inventoryValue,
      totalQuantity,
    };
  }, [report]);

  const handleThresholdApply = () => {
    const parsed = Number(thresholdInput);

    if (!Number.isInteger(parsed) || parsed < 0) {
      setThresholdInput(String(threshold));
      return;
    }

    setThreshold(parsed);
  };

  const handleThresholdKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleThresholdApply();
    }
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Link>

            <p className="mt-5 text-sm font-semibold text-primary">
              Inventory Reports
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Low Stock Report
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Monitor products that are at or below the selected stock threshold
              and need replenishment attention.
            </p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_220px_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Branch
              </span>

              <SearchableSelect
                value={branchId}
                onChange={setBranchId}
                options={branchOptions}
                placeholder="All branches"
                searchPlaceholder="Search branch..."
                emptyMessage="No branches found."
                disabled={optionsLoading || loading}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Product
              </span>

              <SearchableSelect
                value={productId}
                onChange={setProductId}
                options={productOptions}
                placeholder="All products"
                searchPlaceholder="Search product..."
                emptyMessage="No products found."
                disabled={optionsLoading || loading}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Low Stock Threshold
              </span>

              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                  onKeyDown={handleThresholdKeyDown}
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={handleThresholdApply}
                  disabled={loading}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </label>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Showing products with quantity{" "}
              <span className="font-semibold text-slate-700">
                ≤ {report?.threshold ?? threshold}
              </span>
              .
            </p>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Unable to load report
                </p>

                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Low Stock Items"
            value={formatNumber(summary.items)}
            detail={`Threshold: ${report?.threshold ?? threshold}`}
            icon={<Boxes className="h-4 w-4" />}
          />

          <SummaryCard
            label="Out of Stock"
            value={formatNumber(summary.outOfStock)}
            detail="Quantity is exactly zero"
            icon={<AlertTriangle className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Quantity"
            value={formatNumber(summary.totalQuantity)}
            detail="Units currently remaining"
            icon={<Package className="h-4 w-4" />}
          />

          <SummaryCard
            label="Inventory Value"
            value={formatCurrency(summary.inventoryValue)}
            detail="Average cost × quantity"
            icon={<WalletCards className="h-4 w-4" />}
          />
        </section>

        {/* RECORDS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Low Stock Details
                  </h2>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Products requiring replenishment attention.
                </p>
              </div>

              <div className="text-xs text-slate-400">
                {report
                  ? `${report.count} item${report.count === 1 ? "" : "s"}`
                  : "Loading"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading low stock report...
              </div>
            </div>
          ) : !report || report.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No low stock items
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-400">
                No products are at or below the selected stock threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Branch
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Average Cost
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Inventory Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.items.map((item) => {
                    const branch = branches.find(
                      (entry) => entry.id === item.branchId,
                    );

                    return (
                      <tr
                        key={`${item.branchId}-${item.productId}`}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4 align-middle">
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {item.sku}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.productName}
                            </p>

                            <span
                              className={[
                                "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                getQuantityClass(
                                  item.quantity,
                                  report.threshold,
                                ),
                              ].join(" ")}
                            >
                              {getQuantityLabel(item.quantity)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle text-sm text-slate-600">
                          {item.category ?? "—"}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          {branch ? (
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {branch.name}
                              </p>

                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                {branch.code}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              {item.branchId}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right align-middle">
                          <span
                            className={[
                              "inline-flex min-w-12 justify-center rounded-lg px-2.5 py-1 text-sm font-bold",
                              getQuantityClass(item.quantity, report.threshold),
                            ].join(" ")}
                          >
                            {formatNumber(item.quantity)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right align-middle font-medium text-slate-700">
                          {formatCurrency(item.averageCost)}
                        </td>

                        <td className="px-5 py-4 text-right align-middle font-bold text-slate-900">
                          {formatCurrency(item.inventoryValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td
                      colSpan={4}
                      className="px-5 py-4 text-sm font-semibold text-slate-900"
                    >
                      Total
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {formatNumber(summary.totalQuantity)}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-medium text-slate-400">
                      —
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-primary">
                      {formatCurrency(summary.inventoryValue)}
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
