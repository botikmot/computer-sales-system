"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getPurchaseOrderReport } from "@/features/reports/reports-api";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function getDefaultFrom() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getDefaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "APPROVED":
      return "bg-blue-50 text-blue-700";

    case "SENT":
      return "bg-indigo-50 text-indigo-700";

    case "PARTIALLY_RECEIVED":
      return "bg-amber-50 text-amber-700";

    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700";

    case "CLOSED":
      return "bg-green-50 text-green-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PurchaseOrderReportPage() {
  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);

  const [appliedFrom, setAppliedFrom] = useState(getDefaultFrom);
  const [appliedTo, setAppliedTo] = useState(getDefaultTo);

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getPurchaseOrderReport>
  > | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getPurchaseOrderReport({
          from: appliedFrom,
          to: appliedTo,
        });

        if (cancelled) {
          return;
        }

        setData(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load purchase order report.",
        );
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
  }, [appliedFrom, appliedTo]);

  const summary = useMemo(() => {
    return {
      purchaseOrders: data?.count ?? 0,
      total: Number(data?.total ?? 0),
    };
  }, [data]);

  function handleApply() {
    setError("");

    if (!from || !to) {
      return;
    }

    if (from > to) {
      setError("The From date cannot be later than the To date.");
      return;
    }

    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function handleReset() {
    const defaultFrom = getDefaultFrom();
    const defaultTo = getDefaultTo();

    setFrom(defaultFrom);
    setTo(defaultTo);
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
    setError("");
  }

  return (
    <AppShell>
      <main className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/reports"
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-700" />

                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Purchase Order Report
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Purchase orders created during the selected reporting period.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />

            <h2 className="text-sm font-semibold text-slate-900">
              Reporting Period
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label
                htmlFor="po-from"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                From
              </label>

              <input
                id="po-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="po-to"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                To
              </label>

              <input
                id="po-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleApply}
                disabled={!from || !to || loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                <BarChart3 className="h-4 w-4" />
                Apply
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Purchase Orders</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : summary.purchaseOrders}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Purchase Value</p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : formatCurrency(summary.total)}
            </p>
          </div>
        </section>

        {/* Period */}
        <div className="text-sm text-slate-500">
          Period:{" "}
          <span className="font-medium text-slate-700">
            {formatDate(appliedFrom)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700">
            {formatDate(appliedTo)}
          </span>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Purchase Orders
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    PO Number
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Order Date
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Supplier
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Branch
                  </th>

                  <th className="px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading purchase orders...
                    </td>
                  </tr>
                ) : data?.purchaseOrders.length ? (
                  data.purchaseOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {order.poNumber}
                        </div>

                        {order.expectedDate && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Expected: {formatDate(order.expectedDate)}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatDate(order.orderDate)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {order.supplier.name}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {order.supplier.code}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {order.branch.name}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {order.branch.code}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            order.status,
                          )}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(order.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No purchase orders found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>

              {!loading && data?.purchaseOrders.length ? (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 font-semibold text-slate-900"
                    >
                      Total
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(summary.total)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
