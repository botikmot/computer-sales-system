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
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches } from "@/features/branches/branches-api";
import { getCashBankAccounts } from "@/features/cash-bank/cash-bank-accounts-api";
import {
  getCashDisbursements,
  type CashDisbursementsResponse,
} from "@/features/reports/reports-api";
import Link from "next/link";

type BranchOption = Awaited<ReturnType<typeof getBranches>>[number];
type CashAccountOption = Awaited<
  ReturnType<typeof getCashBankAccounts>
>[number];

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthStartDate() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load cash disbursements. Please try again.";
}

export default function CashDisbursementsReportPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [accounts, setAccounts] = useState<CashAccountOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState(getMonthStartDate);
  const [to, setTo] = useState(getLocalDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState<CashDisbursementsResponse | null>(null);
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

    getCashBankAccounts()
      .then((result) => {
        if (active) setAccounts(result);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getCashDisbursements({
      from,
      to,
      ...(branchId ? { branchId } : {}),
      ...(accountId ? { accountId } : {}),
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
  }, [from, to, branchId, accountId, page, limit, reloadKey]);

  const visibleAccounts = accounts.filter(
    (account) =>
      account.accountType === "CASH" &&
      account.isActive &&
      (!branchId || account.branchId === branchId),
  );

  const totalPages = Math.max(1, data?.pagination.pages ?? 1);
  const totalRecords = data?.count ?? 0;
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  function changeBranch(value: string) {
    setLoading(true);
    setError("");
    setBranchId(value);
    setAccountId("");
    setPage(1);
  }

  function changeFrom(value: string) {
    if (!value) return;

    setLoading(true);
    setError("");
    setFrom(value);

    if (to && value > to) {
      setTo(value);
    }

    setPage(1);
  }

  function changeTo(value: string) {
    if (!value) return;

    setLoading(true);
    setError("");
    setTo(value);

    if (from && value < from) {
      setFrom(value);
    }

    setPage(1);
  }

  function changeAccount(value: string) {
    setLoading(true);
    setError("");
    setAccountId(value);
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
              Cash Disbursements
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Review outgoing cash transactions by date, branch and cash
              account.
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

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Total Cash Disbursements
              </p>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>

            <p className="mt-3 break-words text-2xl font-bold text-slate-900">
              {loading && !data ? "—" : formatCurrency(data?.total)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Total for all matching cash-out transactions
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                Disbursement Transactions
              </p>
              <Banknote className="h-5 w-5 text-blue-600" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {loading && !data ? "—" : totalRecords.toLocaleString("en-PH")}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              All matching records, not just the current page
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="disbursements-branch"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Branch
              </label>

              <select
                id="disbursements-branch"
                value={branchId}
                onChange={(event) => changeBranch(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                htmlFor="disbursements-account"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Cash Account
              </label>

              <select
                id="disbursements-account"
                value={accountId}
                onChange={(event) => changeAccount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All cash accounts</option>
                {visibleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.accountNumber ? ` (${account.accountNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="disbursements-from"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                From
              </label>

              <input
                id="disbursements-from"
                type="date"
                value={from}
                required
                max={to || getLocalDate()}
                onChange={(event) => changeFrom(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="disbursements-to"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                To
              </label>

              <input
                id="disbursements-to"
                type="date"
                value={to}
                required
                min={from || undefined}
                max={getLocalDate()}
                onChange={(event) => changeTo(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Default range: current month. Only outgoing cash transactions within
            the selected dates are included.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load cash disbursements</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Cash Disbursement Transactions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading cash disbursement records..."
                  : `Showing ${startRecord}–${endRecord} of ${totalRecords} transactions`}
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
            <table className="min-w-[1150px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date &amp; Time</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Cash Account</th>
                  <th className="px-5 py-3 font-semibold">Transaction Type</th>
                  <th className="px-5 py-3 font-semibold">Reference No.</th>
                  <th className="px-5 py-3 font-semibold">Notes</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Amount Paid Out
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading cash disbursements...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 font-medium text-slate-700">
                        No cash disbursements found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another branch, cash account or date range.
                      </p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatDate(transaction.transactionDate)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {transaction.branch.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.branch.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {transaction.account.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatLabel(transaction.account.accountType)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatLabel(transaction.transactionType)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {transaction.referenceNo || "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        <span className="line-clamp-2">
                          {transaction.notes || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-red-700">
                        {formatCurrency(transaction.amount)}
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
