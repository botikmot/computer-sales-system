"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  Scale,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getBalanceSheet,
  type BalanceSheetResponse,
} from "@/features/reports/reports-api";

type ReportFilters = {
  branchId: string;
  asOfDate: string;
};

type StatementLine = {
  label: string;
  amount: string | number;
  kind?: "normal" | "subtotal" | "total" | "equity";
  detail?: string;
};

const initialResponse: BalanceSheetResponse = {
  asOfDate: "",
  assets: {
    cashAndBank: 0,
    accountsReceivable: 0,
    inventory: 0,
    total: 0,
  },
  liabilities: {
    accountsPayable: 0,
    total: 0,
  },
  derivedEquity: 0,
  accounts: [],
  inventoryCount: 0,
  receivableCount: 0,
  payableCount: 0,
};

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDateLabel(value: string) {
  if (!value) return "—";

  // Treat YYYY-MM-DD as a local calendar date and avoid UTC date rollbacks.
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T12:00:00`);
  if (Number.isNaN(date.getTime())) return datePart;

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: unknown;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "emerald" | "violet";
}) {
  const toneClasses = {
    blue: { icon: "bg-blue-50 text-blue-700", value: "text-slate-950" },
    amber: { icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: toNumber(value) < 0 ? "text-rose-700" : "text-emerald-700",
    },
    violet: { icon: "bg-violet-50 text-violet-700", value: "text-slate-950" },
  } as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-3 break-words text-2xl font-bold tracking-tight ${toneClasses[tone].value}`}
          >
            {formatCurrency(value)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

function StatementSection({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: StatementLine[];
}) {
  return (
    <section>
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const isEmphasized = row.kind === "subtotal" || row.kind === "total";
          const isEquity = row.kind === "equity";

          return (
            <div
              key={row.label}
              className={[
                "flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                isEmphasized ? "bg-slate-50/80" : "bg-white",
                isEquity ? "bg-blue-50/70" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p
                  className={[
                    "text-sm",
                    isEmphasized || isEquity
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-700",
                    row.kind === "total" ? "uppercase tracking-wide" : "",
                  ].join(" ")}
                >
                  {row.label}
                </p>
                {row.detail ? (
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {row.detail}
                  </p>
                ) : null}
              </div>

              <p
                className={[
                  "whitespace-nowrap text-right font-mono text-sm tabular-nums",
                  isEmphasized || isEquity
                    ? "font-bold text-slate-950"
                    : "font-medium text-slate-700",
                ].join(" ")}
              >
                {formatCurrency(row.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function BalanceSheetPage() {
  const initialAsOfDate = getTodayDate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [asOfDate, setAsOfDate] = useState(initialAsOfDate);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    branchId: "",
    asOfDate: initialAsOfDate,
  });

  const [response, setResponse] =
    useState<BalanceSheetResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      try {
        const result = await getBranches();
        if (!active) return;
        setBranches(result);
        setOptionsError("");
      } catch (loadError: unknown) {
        if (!active) return;
        setOptionsError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load branch options.",
        );
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void loadBranches();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBalanceSheet() {
      try {
        const result = await getBalanceSheet({
          ...(appliedFilters.branchId
            ? { branchId: appliedFilters.branchId }
            : {}),
          asOfDate: appliedFilters.asOfDate,
        });

        if (!active) return;
        setResponse(result);
        setError("");
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the balance sheet.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBalanceSheet();

    return () => {
      active = false;
    };
  }, [appliedFilters, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);
  const selectedBranch = activeBranches.find(
    (branch) => branch.id === appliedFilters.branchId,
  );

  function applyFilters() {
    if (!asOfDate) {
      setError("Please select an as-of date.");
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);
    setAppliedFilters({ branchId, asOfDate });
  }

  function resetFilters() {
    const nextDate = getTodayDate();
    setBranchId("");
    setAsOfDate(nextDate);
    setError("");
    setLoading(true);
    setAppliedFilters({ branchId: "", asOfDate: nextDate });
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  const totalAssets = toNumber(response.assets.total);
  const totalLiabilities = toNumber(response.liabilities.total);
  const derivedEquity = toNumber(response.derivedEquity);
  const liabilityAndEquity = totalLiabilities + derivedEquity;
  const balanceDifference = Math.abs(totalAssets - liabilityAndEquity);
  const isBalancedAtDisplayedPrecision = balanceDifference < 0.01;

  const assetRows: StatementLine[] = [
    {
      label: "Cash and Bank",
      amount: response.assets.cashAndBank,
      detail: `${response.accounts.length} cash/bank account${response.accounts.length === 1 ? "" : "s"} included as of the selected date.`,
    },
    {
      label: "Accounts Receivable",
      amount: response.assets.accountsReceivable,
      detail: `${response.receivableCount} open or partially paid receivable record${response.receivableCount === 1 ? "" : "s"} with an outstanding balance.`,
    },
    {
      label: "Inventory",
      amount: response.assets.inventory,
      detail: `${response.inventoryCount} inventory balance record${response.inventoryCount === 1 ? "" : "s"} valued using quantity multiplied by average cost.`,
    },
    {
      label: "Total Assets",
      amount: response.assets.total,
      kind: "total",
    },
  ];

  const liabilityRows: StatementLine[] = [
    {
      label: "Accounts Payable",
      amount: response.liabilities.accountsPayable,
      detail: `${response.payableCount} open or partially paid payable record${response.payableCount === 1 ? "" : "s"} with an outstanding balance.`,
    },
    {
      label: "Total Liabilities",
      amount: response.liabilities.total,
      kind: "total",
    },
  ];

  const equityRows: StatementLine[] = [
    {
      label: "Derived Equity",
      amount: response.derivedEquity,
      kind: "equity",
      detail:
        "Calculated by this report as total assets less total liabilities currently included in the report.",
    },
  ];

  return (
    <AppShell>
      <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports Center
          </Link>

          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <ClipboardList className="h-3.5 w-3.5" />
                Management / Financial
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Balance Sheet
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review cash and bank balances, receivables, inventory, payables,
                and derived equity as of a selected date.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={refreshReport}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Report Filters
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="balance-sheet-branch"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Branch
                </label>
                <select
                  id="balance-sheet-branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  disabled={optionsLoading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">All accessible branches</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="balance-sheet-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  As of Date
                </label>
                <input
                  id="balance-sheet-date"
                  type="date"
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading || optionsLoading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>

            {optionsError ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Branch options could not be loaded: {optionsError}
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Balances are calculated up to the end of{" "}
              {formatDateLabel(appliedFilters.asOfDate)}
              {selectedBranch
                ? ` for ${selectedBranch.name}`
                : " across all accessible branches"}
              .
            </p>
          </section>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Unable to display this report</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
              <button
                type="button"
                onClick={refreshReport}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Assets"
              value={response.assets.total}
              subtitle="Cash/bank, receivables, and inventory"
              icon={Landmark}
              tone="blue"
            />
            <SummaryCard
              title="Total Liabilities"
              value={response.liabilities.total}
              subtitle="Accounts payable included in this report"
              icon={ClipboardList}
              tone="amber"
            />
            <SummaryCard
              title="Derived Equity"
              value={response.derivedEquity}
              subtitle="Total assets less reported liabilities"
              icon={Scale}
              tone="emerald"
            />
            <SummaryCard
              title="Cash & Bank"
              value={response.assets.cashAndBank}
              subtitle={`${response.accounts.length} cash/bank account${response.accounts.length === 1 ? "" : "s"}`}
              icon={Wallet}
              tone="violet"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Statement Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  As of {formatDateLabel(appliedFilters.asOfDate)}
                  {selectedBranch
                    ? ` · ${selectedBranch.name}`
                    : " · All accessible branches"}
                </p>
              </div>
              <div
                className={[
                  "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                  isBalancedAtDisplayedPrecision
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                <Scale className="h-4 w-4" />
                {isBalancedAtDisplayedPrecision
                  ? "Assets equal liabilities + equity"
                  : `Difference: ${formatCurrency(balanceDifference)}`}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-700">
                  Generating balance sheet…
                </p>
                <p className="text-xs text-slate-500">
                  Calculating cash/bank, receivables, inventory, and payables.
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-40 items-center justify-center px-6 py-10 text-center">
                <p className="max-w-md text-sm text-slate-500">
                  The statement details are unavailable until the report loads
                  successfully.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                <StatementSection
                  title="Assets"
                  description="Resources included in the current report calculation."
                  rows={assetRows}
                />
                <StatementSection
                  title="Liabilities"
                  description="Outstanding accounts payable included in the current report calculation."
                  rows={liabilityRows}
                />
                <StatementSection
                  title="Equity"
                  description="Equity is currently derived from the assets and liabilities above."
                  rows={equityRows}
                />
                <div className="flex flex-col gap-3 bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-bold">
                      Total Liabilities + Equity
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Accounts payable plus derived equity.
                    </p>
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums text-emerald-300">
                    {formatCurrency(liabilityAndEquity)}
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <UsersRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  How this balance sheet is calculated
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-900/80">
                  Assets include cash/bank balances, outstanding accounts
                  receivable, and inventory valued at quantity multiplied by
                  average cost. Liabilities currently include outstanding
                  accounts payable. The backend derives equity as total assets
                  minus these reported liabilities; it is not yet a separate
                  ledger-based capital or retained-earnings balance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
