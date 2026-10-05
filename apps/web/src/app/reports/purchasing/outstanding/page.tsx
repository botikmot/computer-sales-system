"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getOutstandingPurchaseOrders,
  type OutstandingPurchaseOrdersResponse,
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

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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
  }).format(date);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusClasses(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "SENT":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "PARTIALLY_RECEIVED":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function SummaryCard({
  label,
  value,
  icon,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
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
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export default function OutstandingPurchaseOrdersPage() {
  const [fromDate, setFromDate] = useState(getInitialFromDate);
  const [toDate, setToDate] = useState(getInitialToDate);

  const [activeFromDate, setActiveFromDate] = useState(getInitialFromDate);
  const [activeToDate, setActiveToDate] = useState(getInitialToDate);

  const [report, setReport] =
    useState<OutstandingPurchaseOrdersResponse | null>(null);

  const [expandedPoIds, setExpandedPoIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const result = await getOutstandingPurchaseOrders({
          from: activeFromDate,
          to: activeToDate,
        });

        if (cancelled) {
          return;
        }

        setReport(result);
        setExpandedPoIds(new Set());
      } catch (err) {
        if (cancelled) {
          return;
        }

        setReport(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load outstanding purchase orders report.",
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
  }, [activeFromDate, activeToDate]);

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

  function togglePo(poId: string) {
    setExpandedPoIds((current) => {
      const next = new Set(current);

      if (next.has(poId)) {
        next.delete(poId);
      } else {
        next.add(poId);
      }

      return next;
    });
  }

  const purchaseOrders = report?.purchaseOrders ?? [];

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
              Purchasing Reports
            </span>

            <span className="text-slate-300">/</span>

            <span className="text-sm text-slate-500">
              Outstanding Purchase Orders
            </span>
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Outstanding Purchase Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review purchase orders with items that are still pending receipt.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="fromDate"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  From
                </label>

                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="toDate"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                  To
                </label>

                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
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

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Report period:</span>

            <span>{formatDate(report?.from ?? activeFromDate)}</span>

            <span className="text-slate-300">to</span>

            <span>{formatDate(report?.to ?? activeToDate)}</span>
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
        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            label="Outstanding Purchase Orders"
            value={report?.count ?? 0}
            icon={<ClipboardList className="h-4 w-4" />}
          />

          <SummaryCard
            label="Outstanding Total"
            value={formatCurrency(report?.outstandingTotal ?? 0)}
            icon={<span className="text-sm font-bold">₱</span>}
            valueClassName="text-primary"
          />
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">
              Outstanding Purchase Orders
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Purchase orders with quantities still pending receipt.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading outstanding purchase orders...
              </div>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                No outstanding purchase orders
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                There are no purchase orders with pending quantities for the
                selected period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <TableHeader>PO Number</TableHeader>
                    <TableHeader>Order Date</TableHeader>
                    <TableHeader>Supplier</TableHeader>
                    <TableHeader>Branch</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="right">Outstanding</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map((po) => {
                    const expanded = expandedPoIds.has(po.id);

                    return (
                      <tr key={po.id} className="group">
                        <td colSpan={7} className="p-0">
                          <div
                            className={[
                              "grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-0 transition",
                              expanded
                                ? "bg-slate-50/70"
                                : "hover:bg-slate-50/60",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={() => togglePo(po.id)}
                              aria-label={
                                expanded
                                  ? `Collapse ${po.poNumber}`
                                  : `Expand ${po.poNumber}`
                              }
                              className="flex h-full min-h-[72px] w-12 items-center justify-center text-slate-400 transition hover:text-slate-900"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            <div className="min-w-0 px-3 py-4">
                              <p className="text-sm font-bold text-slate-900">
                                {po.poNumber}
                              </p>
                            </div>

                            <div className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatDate(po.orderDate)}
                            </div>

                            <div className="min-w-[180px] px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {po.supplier.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {po.supplier.code}
                              </p>
                            </div>

                            <div className="min-w-[150px] px-5 py-4">
                              <p className="text-sm font-medium text-slate-700">
                                {po.branch.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {po.branch.code}
                              </p>
                            </div>

                            <div className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                                  getStatusClasses(po.status),
                                ].join(" ")}
                              >
                                {formatStatus(po.status)}
                              </span>
                            </div>

                            <div className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-primary">
                              {formatCurrency(po.outstandingTotal)}
                            </div>
                          </div>

                          {expanded ? (
                            <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-5">
                              <div className="ml-12 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 px-4 py-3">
                                  <h3 className="text-sm font-bold text-slate-900">
                                    Outstanding Items
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Remaining quantities on this purchase order.
                                  </p>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full">
                                    <thead className="border-b border-slate-100 bg-slate-50">
                                      <tr>
                                        <TableHeader>Product</TableHeader>
                                        <TableHeader align="right">
                                          Ordered
                                        </TableHeader>
                                        <TableHeader align="right">
                                          Received
                                        </TableHeader>
                                        <TableHeader align="right">
                                          Remaining
                                        </TableHeader>
                                        <TableHeader align="right">
                                          Unit Cost
                                        </TableHeader>
                                        <TableHeader align="right">
                                          Outstanding
                                        </TableHeader>
                                      </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                      {po.items.map((item) => (
                                        <tr key={item.id}>
                                          <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-900">
                                              {item.product.name}
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-400">
                                              {item.product.sku}
                                            </p>
                                          </td>

                                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                                            {item.quantity}
                                          </td>

                                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                                            {item.receivedQuantity}
                                          </td>

                                          <td className="px-4 py-3 text-right text-sm font-bold text-amber-600">
                                            {item.remainingQuantity}
                                          </td>

                                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                                            {formatCurrency(item.unitCost)}
                                          </td>

                                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                                            {formatCurrency(
                                              item.outstandingAmount,
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>

                                    <tfoot className="border-t border-slate-200 bg-slate-50">
                                      <tr>
                                        <td
                                          colSpan={5}
                                          className="px-4 py-3 text-right text-sm font-bold text-slate-900"
                                        >
                                          PO Outstanding Total
                                        </td>

                                        <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                                          {formatCurrency(po.outstandingTotal)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className="border-t border-slate-200 bg-slate-50/70">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-4 text-right text-sm font-bold text-slate-900"
                    >
                      Total Outstanding
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-primary">
                      {formatCurrency(report?.outstandingTotal ?? 0)}
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
