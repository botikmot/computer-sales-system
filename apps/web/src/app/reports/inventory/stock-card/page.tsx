"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Boxes,
  CalendarDays,
  ClipboardList,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import { getProducts, type Product } from "@/features/products/products-api";

import {
  getInventoryStockCard,
  type InventoryStockCardResponse,
} from "@/features/reports/reports-api";

function getInitialFromDate() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getInitialToDate() {
  return new Date().toISOString().slice(0, 10);
}

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

function formatDate(value: string | null | undefined) {
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
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
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

function formatMovementType(value: string) {
  return value.replaceAll("_", " ");
}

function getMovementTypeClass(quantityChange: number) {
  if (quantityChange > 0) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (quantityChange < 0) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
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

export default function StockCardReportPage() {
  const [fromDate, setFromDate] = useState(getInitialFromDate);
  const [toDate, setToDate] = useState(getInitialToDate);

  const [activeFromDate, setActiveFromDate] = useState(getInitialFromDate);
  const [activeToDate, setActiveToDate] = useState(getInitialToDate);

  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [optionsLoading, setOptionsLoading] = useState(true);

  const [report, setReport] = useState<InventoryStockCardResponse | null>(null);

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

    async function loadReport() {
      setLoading(true);

      try {
        const result = await getInventoryStockCard({
          from: activeFromDate,
          to: activeToDate,
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
            : "Unable to load stock card report.",
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
  }, [activeFromDate, activeToDate, branchId, productId]);

  function handleApplyFilters() {
    if (!fromDate || !toDate) {
      setError("Please select both From and To dates.");
      return;
    }

    if (fromDate > toDate) {
      setError("From date cannot be later than To date.");
      return;
    }

    setActiveFromDate(fromDate);
    setActiveToDate(toDate);
  }

  const branchOptions: SelectOption[] = branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
    description: branch.code,
  }));

  const productOptions: SelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${product.sku} • ${product.unit}`,
  }));

  const movements = report?.movements ?? [];

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

            <span className="text-sm text-slate-500">Stock Card</span>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Stock Card
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review inventory movement history, quantity changes, running
              balances, and inventory costs.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="fromDate"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
              >
                From
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="toDate"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
              >
                To
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

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
                Report period:
              </span>{" "}
              {formatDate(report?.from ?? activeFromDate)}{" "}
              <span className="mx-1 text-slate-300">to</span>{" "}
              {formatDate(report?.to ?? activeToDate)}
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading || optionsLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {loading ? "Loading..." : "Apply Filters"}
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
        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Total Movements"
            value={report?.count ?? 0}
            icon={<ClipboardList className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total In"
            value={report?.totalIn ?? 0}
            icon={<ArrowUp className="h-4 w-4" />}
            valueClassName="text-emerald-700"
          />

          <SummaryCard
            label="Total Out"
            value={report?.totalOut ?? 0}
            icon={<ArrowDown className="h-4 w-4" />}
            valueClassName="text-rose-700"
          />

          <SummaryCard
            label="Net Change"
            value={report?.netQuantityChange ?? 0}
            icon={<Boxes className="h-4 w-4" />}
            valueClassName={
              (report?.netQuantityChange ?? 0) >= 0
                ? "text-emerald-700"
                : "text-rose-700"
            }
          />
        </section>

        {/* MOVEMENTS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">
              Inventory Movement Ledger
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Chronological inventory movements for the selected filters.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading stock card...
              </div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Boxes className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No inventory movements found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No inventory movement records match the selected date, branch,
                and product filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1200px]">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Movement</TableHeader>
                    <TableHeader align="right">Qty Change</TableHeader>
                    <TableHeader align="right">Balance After</TableHeader>
                    <TableHeader align="right">Unit Cost</TableHeader>
                    <TableHeader align="right">Total Cost</TableHeader>
                    <TableHeader align="right">Avg. Cost After</TableHeader>
                    <TableHeader>Reference</TableHeader>
                    <TableHeader>Notes</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDateTime(movement.date)}
                      </td>

                      <td className="min-w-[220px] px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {movement.productName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {movement.sku}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                            getMovementTypeClass(movement.quantityChange),
                          ].join(" ")}
                        >
                          {formatMovementType(movement.type)}
                        </span>
                      </td>

                      <td
                        className={[
                          "whitespace-nowrap px-5 py-4 text-right text-sm font-bold",
                          movement.quantityChange > 0
                            ? "text-emerald-700"
                            : movement.quantityChange < 0
                              ? "text-rose-700"
                              : "text-slate-700",
                        ].join(" ")}
                      >
                        {movement.quantityChange > 0 ? "+" : ""}
                        {movement.quantityChange}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                        {movement.balanceAfter}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                        {formatCurrency(movement.unitCost)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(movement.totalCost)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                        {formatCurrency(movement.averageCostAfter)}
                      </td>

                      <td className="max-w-[220px] px-5 py-4">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {movement.referenceType
                            ? formatMovementType(movement.referenceType)
                            : "—"}
                        </p>

                        {movement.referenceId ? (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {movement.referenceId}
                          </p>
                        ) : null}
                      </td>

                      <td className="max-w-[260px] px-5 py-4 text-sm text-slate-500">
                        <p className="truncate">{movement.notes ?? "—"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
