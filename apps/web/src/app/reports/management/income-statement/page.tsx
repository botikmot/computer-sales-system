"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getIncomeStatement,
  type IncomeStatementResponse,
} from "@/features/reports/reports-api";

type ReportFilters = {
  branchId: string;
  from: string;
  to: string;
};

type StatementLine = {
  label: string;
  amount: string | number;
  kind?: "normal" | "subtotal" | "total" | "profit";
  negative?: boolean;
  detail?: string;
};

const initialResponse: IncomeStatementResponse = {
  from: "",
  to: "",
  revenue: {
    sales: 0,
    salesReturns: 0,
    netSales: 0,
    service: 0,
    total: 0,
  },
  costOfSales: {
    salesCogs: 0,
    repairPartsCost: 0,
    total: 0,
  },
  grossProfit: 0,
  grossMargin: 0,
  operatingExpenses: {
    cashExpenses: 0,
    pettyCashExpenses: 0,
    total: 0,
  },
  estimatedNetIncome: 0,
};

function getDefaultDateRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
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

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

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
    blue: {
      icon: "bg-blue-50 text-blue-700",
      value: "text-slate-950",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: toNumber(value) < 0 ? "text-rose-700" : "text-emerald-700",
    },
    violet: {
      icon: "bg-violet-50 text-violet-700",
      value: "text-slate-950",
    },
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
          const isProfit = row.kind === "profit";

          return (
            <div
              key={row.label}
              className={[
                "flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                isEmphasized ? "bg-slate-50/80" : "bg-white",
                isProfit ? "bg-blue-50/70" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p
                  className={[
                    "text-sm",
                    isEmphasized || isProfit
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
                  isEmphasized || isProfit
                    ? "font-bold text-slate-950"
                    : "font-medium text-slate-700",
                  row.negative ? "text-rose-700" : "",
                ].join(" ")}
              >
                {row.negative ? "−" : ""}
                {formatCurrency(row.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function IncomeStatementPage() {
  const initialRange = getDefaultDateRange();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);

  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    branchId: "",
    from: initialRange.from,
    to: initialRange.to,
  });

  const [response, setResponse] =
    useState<IncomeStatementResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load branch options for the optional branch filter.
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

  // Fetch the statement whenever the applied filters change.
  useEffect(() => {
    let active = true;

    async function loadIncomeStatement() {
      try {
        const result = await getIncomeStatement({
          ...(appliedFilters.branchId
            ? { branchId: appliedFilters.branchId }
            : {}),
          from: appliedFilters.from,
          to: appliedFilters.to,
        });

        if (!active) return;

        setResponse(result);
        setError("");
      } catch (loadError: unknown) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the income statement.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadIncomeStatement();

    return () => {
      active = false;
    };
  }, [appliedFilters, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);
  const selectedBranch = activeBranches.find(
    (branch) => branch.id === appliedFilters.branchId,
  );

  function applyFilters() {
    if (!from || !to) {
      setError("Please select both the start date and end date.");
      setLoading(false);
      return;
    }

    if (from > to) {
      setError("The start date cannot be later than the end date.");
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);
    setAppliedFilters({ branchId, from, to });
  }

  function resetFilters() {
    const nextRange = getDefaultDateRange();

    setBranchId("");
    setFrom(nextRange.from);
    setTo(nextRange.to);
    setError("");
    setLoading(true);
    setAppliedFilters({
      branchId: "",
      from: nextRange.from,
      to: nextRange.to,
    });
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  const grossMargin = toNumber(response.grossMargin);
  const netIncomeIsNegative = toNumber(response.estimatedNetIncome) < 0;

  const revenueRows: StatementLine[] = [
    {
      label: "Sales Revenue",
      amount: response.revenue.sales,
    },
    {
      label: "Less: Sales Returns",
      amount: response.revenue.salesReturns,
      negative: true,
      detail: "Posted sales returns deducted from sales revenue.",
    },
    {
      label: "Net Sales",
      amount: response.revenue.netSales,
      kind: "subtotal",
    },
    {
      label: "Service Revenue",
      amount: response.revenue.service,
      detail: "Posted service invoices within the selected period.",
    },
    {
      label: "Total Revenue",
      amount: response.revenue.total,
      kind: "total",
    },
  ];

  const costRows: StatementLine[] = [
    {
      label: "Inventory Cost of Sales",
      amount: response.costOfSales.salesCogs,
      detail: "Sale inventory cost net of the inventory cost returned.",
    },
    {
      label: "Repair Parts Cost",
      amount: response.costOfSales.repairPartsCost,
      detail: "Parts issued to service jobs with posted invoices.",
    },
    {
      label: "Total Cost of Sales",
      amount: response.costOfSales.total,
      kind: "total",
    },
  ];

  const expenseRows: StatementLine[] = [
    {
      label: "Cash / Bank Expenses",
      amount: response.operatingExpenses.cashExpenses,
      detail: "Recorded cash and bank expense transactions.",
    },
    {
      label: "Petty Cash Expenses",
      amount: response.operatingExpenses.pettyCashExpenses,
      detail: "Posted petty cash vouchers.",
    },
    {
      label: "Total Operating Expenses",
      amount: response.operatingExpenses.total,
      kind: "total",
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
                Income Statement
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review revenue, cost of sales, operating expenses, and estimated
                net income for a selected period.
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="income-statement-branch"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Branch
                </label>
                <select
                  id="income-statement-branch"
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
                  htmlFor="income-statement-from"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  From
                </label>
                <input
                  id="income-statement-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="income-statement-to"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  To
                </label>
                <input
                  id="income-statement-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
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
              The report is calculated from{" "}
              {formatDateLabel(appliedFilters.from)} to{" "}
              {formatDateLabel(appliedFilters.to)}
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
              title="Total Revenue"
              value={response.revenue.total}
              subtitle="Sales after returns plus service revenue"
              icon={Wallet}
              tone="blue"
            />
            <SummaryCard
              title="Total Cost of Sales"
              value={response.costOfSales.total}
              subtitle="Inventory sales cost and repair parts"
              icon={TrendingDown}
              tone="amber"
            />
            <SummaryCard
              title="Gross Profit"
              value={response.grossProfit}
              subtitle={`${grossMargin.toFixed(2)}% gross margin`}
              icon={TrendingUp}
              tone="emerald"
            />
            <SummaryCard
              title="Estimated Net Income"
              value={response.estimatedNetIncome}
              subtitle="Gross profit less recorded operating expenses"
              icon={ClipboardList}
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
                  {formatDateLabel(appliedFilters.from)} –{" "}
                  {formatDateLabel(appliedFilters.to)}
                  {selectedBranch
                    ? ` · ${selectedBranch.name}`
                    : " · All accessible branches"}
                </p>
              </div>
              <div
                className={[
                  "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                  netIncomeIsNegative
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                {netIncomeIsNegative ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {netIncomeIsNegative
                  ? "Net loss for this period"
                  : "Positive net income"}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-700">
                  Generating income statement…
                </p>
                <p className="text-xs text-slate-500">
                  Calculating posted revenue, costs, and expenses.
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
                  title="Revenue"
                  description="Revenue recorded from posted sales and service invoices."
                  rows={revenueRows}
                />
                <StatementSection
                  title="Cost of Sales"
                  description="Costs associated with sold inventory and invoiced service-job parts."
                  rows={costRows}
                />

                <div className="flex flex-col gap-3 bg-blue-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-950">
                      Gross Profit
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Total revenue less total cost of sales · Gross margin:{" "}
                      {grossMargin.toFixed(2)}%
                    </p>
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums text-slate-950">
                    {formatCurrency(response.grossProfit)}
                  </p>
                </div>

                <StatementSection
                  title="Operating Expenses"
                  description="Recorded cash/bank expenses and posted petty cash vouchers in the selected period."
                  rows={expenseRows}
                />

                <div className="flex flex-col gap-3 bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-bold">Estimated Net Income</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Gross profit less total operating expenses recorded by
                      this report.
                    </p>
                  </div>
                  <p
                    className={`font-mono text-xl font-bold tabular-nums ${
                      netIncomeIsNegative ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {formatCurrency(response.estimatedNetIncome)}
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-blue-950">
              How this estimate is calculated
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-900/80">
              This report uses posted sales invoices, posted sales returns,
              posted service invoices, inventory movement costs, cash/bank
              expense transactions, and posted petty cash vouchers. Estimated
              net income reflects the expense categories included in the current
              report logic; it may not represent every accounting adjustment or
              expense outside those records.
            </p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
