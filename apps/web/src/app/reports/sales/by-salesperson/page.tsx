"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  RefreshCw,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSalesBySalesperson } from "@/features/reports/reports-api";

function formatAmount(value: string | number) {
  return Number(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default function SalesBySalespersonPage() {
  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);

  const [appliedFrom, setAppliedFrom] = useState(getDefaultFrom);
  const [appliedTo, setAppliedTo] = useState(getDefaultTo);

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getSalesBySalesperson>
  > | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesBySalesperson({
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
            : "Failed to load sales by salesperson report.",
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
    if (!data) {
      return {
        salespeople: 0,
        invoices: 0,
        totalSales: 0,
        amountPaid: 0,
        balanceDue: 0,
      };
    }

    return {
      salespeople: data.count,
      invoices: data.salespeople.reduce(
        (sum, row) => sum + row.invoiceCount,
        0,
      ),
      totalSales: data.salespeople.reduce(
        (sum, row) => sum + Number(row.totalSales),
        0,
      ),
      amountPaid: data.salespeople.reduce(
        (sum, row) => sum + Number(row.amountPaid),
        0,
      ),
      balanceDue: data.salespeople.reduce(
        (sum, row) => sum + Number(row.balanceDue),
        0,
      ),
    };
  }, [data]);

  function handleApply() {
    if (!from || !to) {
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
  }

  return (
    <AppShell>
      <main className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  Sales by Salesperson
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Sales performance grouped by salesperson for the selected
                period.
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
                htmlFor="from"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                From
              </label>

              <input
                id="from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="to"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                To
              </label>

              <input
                id="to"
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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Salespeople</p>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : summary.salespeople}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Invoices</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : summary.invoices}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Sales</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : `₱${formatAmount(summary.totalSales)}`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Amount Collected</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : `₱${formatAmount(summary.amountPaid)}`}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Balance Due</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? "—" : `₱${formatAmount(summary.balanceDue)}`}
            </p>
          </div>
        </section>

        {/* Report period */}
        <div className="text-sm text-slate-500">
          Period:{" "}
          <span className="font-medium text-slate-700">
            {formatDateLabel(appliedFrom)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700">
            {formatDateLabel(appliedTo)}
          </span>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Salesperson Performance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Salesperson
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Invoices
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Total Sales
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Collected
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Balance Due
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading sales by salesperson...
                    </td>
                  </tr>
                ) : data?.salespeople.length ? (
                  data.salespeople.map((row) => (
                    <tr
                      key={row.salesperson.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {row.salesperson.fullName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          @{row.salesperson.username}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        {row.invoiceCount}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        ₱{formatAmount(row.totalSales)}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        ₱{formatAmount(row.amountPaid)}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        ₱{formatAmount(row.balanceDue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No salesperson sales found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>

              {!loading && data?.salespeople.length ? (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      Total
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {summary.invoices}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      ₱{formatAmount(summary.totalSales)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      ₱{formatAmount(summary.amountPaid)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      ₱{formatAmount(summary.balanceDue)}
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
