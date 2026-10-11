"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches } from "@/features/branches/branches-api";
import {
  getDailyCashReport,
  type DailyCashReportResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

type BranchOption = Awaited<ReturnType<typeof getBranches>>[number];

function getLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load the daily cash report. Please try again.";
}

export default function DailyCashReportPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState<DailyCashReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getBranches()
      .then((result) => {
        if (active) setBranches(result);
      })
      .catch(() => {
        if (active) setBranches([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getDailyCashReport({
      date,
      ...(branchId ? { branchId } : {}),
      page,
      limit,
    })
      .then((result) => {
        if (!active) return;

        setData(result);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, branchId, page, limit, reloadKey]);

  const totalPages = Math.max(1, data?.pagination.pages ?? 1);
  const totalAccounts = data?.count ?? 0;
  const startRecord = totalAccounts === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalAccounts);

  function changeBranch(value: string) {
    setLoading(true);
    setError("");
    setBranchId(value);
    setPage(1);
  }

  function changeDate(value: string) {
    setLoading(true);
    setError("");
    setDate(value);
    setPage(1);
  }

  function changePageSize(value: string) {
    setLoading(true);
    setError("");
    setLimit(Number(value));
    setPage(1);
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    setLoading(true);
    setError("");
    setPage(nextPage);
  }

  const summaryCards = [
    {
      label: "Opening Balance",
      value: data?.openingBalance,
      icon: <Wallet className="h-5 w-5 text-blue-600" />,
      description: "Balance at the start of the day",
    },
    {
      label: "Cash Receipts",
      value: data?.cashReceipts,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      description: "Cash received during the day",
    },
    {
      label: "Cash Disbursements",
      value: data?.cashDisbursements,
      icon: <TrendingDown className="h-5 w-5 text-red-600" />,
      description: "Cash paid out during the day",
    },
    {
      label: "Closing Balance",
      value: data?.closingBalance,
      icon: <Banknote className="h-5 w-5 text-indigo-600" />,
      description: "Opening + receipts − disbursements",
    },
  ];

  return (
    <AppShell>
      <main className="space-y-6 px-4 py-6 md:px-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reports Center
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <FileBarChart className="h-4 w-4" />
              Reports / Cash &amp; Bank
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daily Cash Report
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review daily cash balances, receipts and disbursements across
              active cash accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div>
              <label
                htmlFor="cash-report-branch"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>

              <select
                id="cash-report-branch"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All accessible branches</option>

                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code ? `${branch.code} — ` : ""}
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="cash-report-date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Report Date
              </label>

              <input
                id="cash-report-date"
                type="date"
                value={date}
                max={getLocalDate()}
                onChange={(event) => changeDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load daily cash report</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                {card.icon}
              </div>

              <p className="mt-3 break-words text-xl font-bold tabular-nums text-slate-900">
                {loading ? "—" : formatCurrency(card.value)}
              </p>

              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Cash Account Breakdown
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading cash accounts..."
                  : `Showing ${startRecord}–${endRecord} of ${totalAccounts} accounts`}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Rows per page
              <select
                value={limit}
                onChange={(event) => changePageSize(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cash Account</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Account Number</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Opening Balance
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Receipts
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Disbursements
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Closing Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading cash account balances...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Wallet className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-3 font-medium text-slate-700">
                        No active cash accounts found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Try another branch or choose a different report date.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {account.name}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {account.branch.code ? `${account.branch.code} — ` : ""}
                        {account.branch.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {account.accountNumber || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                        {formatCurrency(account.openingBalance)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-emerald-700">
                        {formatCurrency(account.cashReceipts)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-red-700">
                        {formatCurrency(account.cashDisbursements)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                        {formatCurrency(account.closingBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={loading || page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={loading || page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
