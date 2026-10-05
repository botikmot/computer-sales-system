"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Loader2,
  RefreshCw,
  RotateCcw,
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
  getInventoryMovement,
  type InventoryMovementResponse,
} from "@/features/reports/reports-api";

const movementTypeOptions: SelectOption[] = [
  {
    value: "",
    label: "All movement types",
    description: "Show all inventory movement types",
  },
  {
    value: "PURCHASE_RECEIPT",
    label: "Purchase Receipt",
    description: "Stock received from purchasing",
  },
  {
    value: "SALE_OUT",
    label: "Sale Out",
    description: "Stock issued for sales",
  },
  {
    value: "REPAIR_ISSUE",
    label: "Repair Issue",
    description: "Parts issued to service jobs",
  },
  {
    value: "ASSEMBLY_CONSUMPTION",
    label: "Assembly Consumption",
    description: "Components consumed during assembly",
  },
  {
    value: "ASSEMBLY_OUTPUT",
    label: "Assembly Output",
    description: "Finished product created by assembly",
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment",
    description: "Physical count adjustment",
  },
  {
    value: "SALES_RETURN",
    label: "Sales Return",
    description: "Stock returned from sales",
  },
];

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

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

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

function formatMovementType(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getMovementBadgeClass(quantityChange: number) {
  if (quantityChange > 0) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (quantityChange < 0) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function InventoryMovementReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [report, setReport] = useState<InventoryMovementResponse | null>(null);

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

        const result = await getInventoryMovement({
          from: from || undefined,
          to: to || undefined,
          branchId: branchId || undefined,
          productId: productId || undefined,
          type: movementType || undefined,
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
            : "Unable to load inventory movement report.",
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
  }, [from, to, branchId, productId, movementType, refreshKey]);

  const branchOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: "",
        label: "All branches",
        description: "Show movements across all branches",
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
        description: "Show movements for all products",
      },
      ...products.map((product) => ({
        value: product.id,
        label: product.name,
        description: product.sku,
      })),
    ],
    [products],
  );

  const selectedBranchName = useMemo(() => {
    if (!branchId) {
      return "All branches";
    }

    return (
      branches.find((branch) => branch.id === branchId)?.name ??
      "Selected branch"
    );
  }, [branchId, branches]);

  const selectedProductName = useMemo(() => {
    if (!productId) {
      return "All products";
    }

    return (
      products.find((product) => product.id === productId)?.name ??
      "Selected product"
    );
  }, [productId, products]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleClearFilters = () => {
    setFrom("");
    setTo("");
    setBranchId("");
    setProductId("");
    setMovementType("");
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
              Inventory Movement
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Review every stock movement by date, branch, product, and movement
              type.
            </p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                From Date
              </span>

              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                To Date
              </span>

              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Movement Type
              </span>

              <SearchableSelect
                value={movementType}
                onChange={setMovementType}
                options={movementTypeOptions}
                placeholder="All movement types"
                searchPlaceholder="Search movement type..."
                emptyMessage="No movement type found."
                disabled={loading}
              />
            </label>

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

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                {loading ? "Loading..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                disabled={
                  loading &&
                  !from &&
                  !to &&
                  !branchId &&
                  !productId &&
                  !movementType
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              {from || to ? (
                <>
                  Period:{" "}
                  <span className="font-semibold text-slate-700">
                    {from || "Beginning"}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {to || "Today"}
                  </span>
                </>
              ) : (
                <>
                  Showing all available movement history for{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedBranchName}
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedProductName}
                  </span>
                  .
                </>
              )}
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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Movements"
            value={formatNumber(report?.count ?? 0)}
            detail="Inventory movement records"
            icon={<Boxes className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total In"
            value={formatNumber(report?.totalIn ?? 0)}
            detail="Positive quantity movement"
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Out"
            value={formatNumber(report?.totalOut ?? 0)}
            detail="Quantity issued out"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />

          <SummaryCard
            label="Net Change"
            value={formatNumber(report?.netQuantityChange ?? 0)}
            detail="Total In minus Total Out"
            icon={<Boxes className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Cost"
            value={formatCurrency(report?.totalCost)}
            detail="Movement cost total"
            icon={<WalletCards className="h-4 w-4" />}
          />
        </section>

        {/* MOVEMENT LEDGER */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Inventory Movement Ledger
                  </h2>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Chronological record of inventory quantity and cost changes.
                </p>
              </div>

              <div className="text-xs text-slate-400">
                {report
                  ? `${report.count} movement${report.count === 1 ? "" : "s"}`
                  : "Loading"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading inventory movements...
              </div>
            </div>
          ) : !report || report.movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Boxes className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No inventory movements found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-400">
                Try changing the date range, branch, product, or movement type.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Movement Type
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Qty Change
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
                      Avg Cost After
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Reference
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Notes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.movements.map((movement) => {
                    const branch = branches.find(
                      (entry) => entry.id === movement.branchId,
                    );

                    return (
                      <tr
                        key={movement.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4 align-middle whitespace-nowrap">
                          <p className="text-sm font-medium text-slate-800">
                            {formatDate(movement.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {movement.productName}
                            </p>

                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {movement.sku}
                            </p>

                            {branch && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {branch.name}{" "}
                                <span className="font-mono">
                                  ({branch.code})
                                </span>
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {formatMovementType(movement.type)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right align-middle">
                          <span
                            className={[
                              "inline-flex min-w-16 justify-center rounded-lg px-2.5 py-1 text-sm font-bold",
                              getMovementBadgeClass(movement.quantityChange),
                            ].join(" ")}
                          >
                            {movement.quantityChange > 0 ? "+" : ""}
                            {formatNumber(movement.quantityChange)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right align-middle text-sm font-semibold text-slate-800">
                          {formatNumber(movement.balanceAfter)}
                        </td>

                        <td className="px-5 py-4 text-right align-middle text-sm font-medium text-slate-700">
                          {formatCurrency(movement.unitCost)}
                        </td>

                        <td className="px-5 py-4 text-right align-middle text-sm font-semibold text-slate-900">
                          {formatCurrency(movement.totalCost)}
                        </td>

                        <td className="px-5 py-4 text-right align-middle text-sm font-medium text-slate-700">
                          {formatCurrency(movement.averageCostAfter)}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {movement.referenceType ?? "—"}
                            </p>

                            {movement.referenceId && (
                              <p className="mt-0.5 max-w-40 truncate font-mono text-[10px] text-slate-400">
                                {movement.referenceId}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <p className="max-w-64 text-xs leading-5 text-slate-500">
                            {movement.notes ?? "—"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td
                      colSpan={3}
                      className="px-5 py-4 text-sm font-semibold text-slate-900"
                    >
                      Total
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {formatNumber(report.netQuantityChange)}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-medium text-slate-400">
                      —
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-medium text-slate-400">
                      —
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-primary">
                      {formatCurrency(report.totalCost)}
                    </td>

                    <td
                      colSpan={3}
                      className="px-5 py-4 text-right text-xs text-slate-400"
                    >
                      {report.from || report.to
                        ? `${report.from || "Beginning"} → ${
                            report.to || "Today"
                          }`
                        : "All dates"}
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
