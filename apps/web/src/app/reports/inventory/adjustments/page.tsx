"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Scale,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getInventoryAdjustments,
  type InventoryAdjustmentsResponse,
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDifferenceClass(difference: number) {
  if (difference > 0) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (difference < 0) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function formatDifference(difference: number) {
  if (difference > 0) {
    return `+${formatNumber(difference)}`;
  }

  return formatNumber(difference);
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
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

export default function InventoryAdjustmentsReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<InventoryAdjustmentsResponse | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      setOptionsLoading(true);

      try {
        const branchData = await getBranches();

        if (!cancelled) {
          setBranches(branchData);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const data = await getInventoryAdjustments({
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(branchId ? { branchId } : {}),
        });

        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load physical count adjustment report.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [from, to, branchId, refreshKey]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        description: branch.code,
      })),
    [branches],
  );

  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === branchId)?.name ?? "",
    [branches, branchId],
  );

  const flattenedItems = useMemo(() => {
    if (!report) {
      return [];
    }

    return report.adjustments.flatMap((adjustment) =>
      adjustment.items.map((item) => ({
        adjustment,
        item,
      })),
    );
  }, [report]);

  const totalNetDifference = report
    ? report.totalIncrease - report.totalDecrease
    : 0;

  const totalCostImpact = useMemo(() => {
    if (!report) {
      return 0;
    }

    return report.adjustments.reduce((adjustmentSum, adjustment) => {
      return (
        adjustmentSum +
        adjustment.items.reduce(
          (itemSum, item) => itemSum + Number(item.totalCost ?? 0),
          0,
        )
      );
    }, 0);
  }, [report]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleClearFilters = () => {
    setFrom("");
    setTo("");
    setBranchId("");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/reports"
              className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Physical Count / Adjustment Report
                </h1>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Posted Only
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Review inventory differences recorded from physical counts and
                posted adjustments.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto_auto] lg:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                From Date
              </label>

              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={loading}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                To Date
              </label>

              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={loading}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Branch
              </label>

              <SearchableSelect
                value={branchId}
                onChange={setBranchId}
                options={branchOptions}
                placeholder={selectedBranchName || "All branches"}
                searchPlaceholder="Search branches..."
                emptyMessage="No branches found."
                disabled={loading || optionsLoading}
              />
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading || (!from && !to && !branchId)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>

          {(from || to || branchId) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {from && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  From: {from}
                </span>
              )}

              {to && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  To: {to}
                </span>
              )}

              {selectedBranchName && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  Branch: {selectedBranchName}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Adjustments"
            value={formatNumber(report?.count ?? 0)}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Increase"
            value={formatNumber(report?.totalIncrease ?? 0)}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />

          <SummaryCard
            label="Total Decrease"
            value={formatNumber(report?.totalDecrease ?? 0)}
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />

          <SummaryCard
            label="Net Difference"
            value={formatNumber(totalNetDifference)}
            icon={<Scale className="h-4 w-4" />}
          />

          <SummaryCard
            label="Cost Impact"
            value={formatCurrency(totalCostImpact)}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
        </div>

        {/* Ledger */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />

                <h2 className="text-base font-semibold text-slate-900">
                  Physical Count Adjustment Ledger
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                Each row represents one product counted within a posted
                inventory adjustment.
              </p>
            </div>

            <span className="text-xs font-medium text-slate-400">
              {flattenedItems.length} item
              {flattenedItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading adjustment report...
              </div>
            </div>
          ) : flattenedItems.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-700">
                No posted adjustments found
              </h3>

              <p className="mt-1 max-w-md text-xs text-slate-400">
                Try changing the date range or branch filter, or post an
                inventory adjustment first.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Adjustment</TableHeader>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Branch</TableHeader>
                    <TableHeader align="right">System Qty</TableHeader>
                    <TableHeader align="right">Counted Qty</TableHeader>
                    <TableHeader align="right">Difference</TableHeader>
                    <TableHeader align="right">Unit Cost</TableHeader>
                    <TableHeader align="right">Total Cost</TableHeader>
                    <TableHeader>Reason</TableHeader>
                    <TableHeader>Notes</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {flattenedItems.map(({ adjustment, item }) => (
                    <tr
                      key={`${adjustment.id}-${item.id}`}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 align-top text-xs text-slate-600">
                        {formatDate(adjustment.adjustmentDate)}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <Link
                          href={`/adjustments/${adjustment.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 transition hover:text-primary"
                        >
                          {adjustment.adjustmentNo}
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </Link>

                        <div className="mt-1">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-700">
                            POSTED
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-slate-800">
                          {item.product.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.product.sku || "No SKU"}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-slate-700">
                          {adjustment.branch.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {adjustment.branch.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right align-top text-sm font-semibold text-slate-700">
                        {formatNumber(item.systemQuantity)}
                      </td>

                      <td className="px-5 py-4 text-right align-top text-sm font-semibold text-slate-700">
                        {formatNumber(item.countedQuantity)}
                      </td>

                      <td className="px-5 py-4 text-right align-top">
                        <span
                          className={[
                            "inline-flex min-w-14 justify-center rounded-lg px-2.5 py-1 text-xs font-bold",
                            getDifferenceClass(item.difference),
                          ].join(" ")}
                        >
                          {formatDifference(item.difference)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right align-top text-sm text-slate-700">
                        {formatCurrency(item.unitCost)}
                      </td>

                      <td className="px-5 py-4 text-right align-top text-sm font-semibold text-slate-800">
                        {formatCurrency(item.totalCost)}
                      </td>

                      <td className="px-5 py-4 align-top text-xs text-slate-600">
                        {item.reason || "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 align-top text-xs leading-5 text-slate-500">
                        {item.notes || adjustment.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-400"
                    >
                      Totals
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-800">
                      {formatNumber(totalNetDifference)}
                    </td>

                    <td />
                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {formatCurrency(totalCostImpact)}
                    </td>

                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {!loading && flattenedItems.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
              <p className="text-xs text-slate-400">
                Showing {flattenedItems.length} adjustment item
                {flattenedItems.length === 1 ? "" : "s"} from{" "}
                {report?.count ?? 0} posted adjustment
                {(report?.count ?? 0) === 1 ? "" : "s"}.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
