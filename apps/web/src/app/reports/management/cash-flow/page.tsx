"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getCashFlow,
  type CashFlowResponse,
} from "@/features/reports/reports-api";

type ReportFilters = {
  branchId: string;
  from: string;
  to: string;
};

type StatementLine = {
  label: string;
  amount: string | number;
  kind?: "normal" | "subtotal" | "total" | "net";
  detail?: string;
};

const initialResponse: CashFlowResponse = {
  from: "",
  to: "",
  inflows: {
    customerCollections: 0,
    otherReceipts: 0,
    total: 0,
  },
  outflows: {
    supplierPayments: 0,
    operatingExpenses: 0,
    customerRefunds: 0,
    pettyCashExpenses: 0,
    total: 0,
  },
  netCashFlow: 0,
  transactionCount: 0,
  pettyCashExpenseCount: 0,
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
  format = "currency",
}: {
  title: string;
  value: unknown;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "emerald" | "violet";
  format?: "currency" | "number";
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
            {format === "number"
              ? new Intl.NumberFormat("en-PH", {
                  maximumFractionDigits: 0,
                }).format(toNumber(value))
              : formatCurrency(value)}
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

          return (
            <div
              key={row.label}
              className={[
                "flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                isEmphasized ? "bg-slate-50/80" : "bg-white",
                row.kind === "net" ? "bg-blue-50/70" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p
                  className={[
                    "text-sm",
                    isEmphasized || row.kind === "net"
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
                  isEmphasized || row.kind === "net"
                    ? "font-bold text-slate-950"
                    : "font-medium text-slate-700",
                  row.kind === "net"
                    ? toNumber(row.amount) < 0
                      ? "text-rose-700"
                      : "text-emerald-700"
                    : "",
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

export default function CashFlowPage() {
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

  const [response, setResponse] = useState<CashFlowResponse>(initialResponse);
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

    async function loadCashFlow() {
      try {
        const result = await getCashFlow({
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
            : "Unable to load the cash flow report.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCashFlow();

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
      setError("Please select both a start date and an end date.");
      return;
    }

    if (from > to) {
      setError("The start date cannot be after the end date.");
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
    setAppliedFilters({ branchId: "", from: nextRange.from, to: nextRange.to });
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  //const totalInflows = toNumber(response.inflows.total);
  //const totalOutflows = toNumber(response.outflows.total);
  const netCashFlow = toNumber(response.netCashFlow);
  const isPositiveCashFlow = netCashFlow >= 0;

  const inflowRows: StatementLine[] = [
    {
      label: "Customer Collections",
      amount: response.inflows.customerCollections,
      detail: "Customer payments received within the selected period.",
    },
    {
      label: "Other Receipts",
      amount: response.inflows.otherReceipts,
      detail: "Other cash or bank receipts recorded in the period.",
    },
    {
      label: "Total Cash Inflows",
      amount: response.inflows.total,
      kind: "total",
    },
  ];

  const outflowRows: StatementLine[] = [
    {
      label: "Supplier Payments",
      amount: response.outflows.supplierPayments,
      detail: "Payments recorded for accounts payable and suppliers.",
    },
    {
      label: "Operating Expenses",
      amount: response.outflows.operatingExpenses,
      detail:
        "Cash/bank transactions recorded with the Expense transaction type.",
    },
    {
      label: "Customer Refunds",
      amount: response.outflows.customerRefunds,
      detail: "Cash/bank refunds paid to customers.",
    },
    {
      label: "Petty Cash Expenses",
      amount: response.outflows.pettyCashExpenses,
      detail: `${response.pettyCashExpenseCount} posted petty cash voucher${response.pettyCashExpenseCount === 1 ? "" : "s"} included in the period.`,
    },
    {
      label: "Total Cash Outflows",
      amount: response.outflows.total,
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
                Cash Flow Report
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review cash received, payments made, operating expenses, and net
                cash movement over a selected period.
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label
                  htmlFor="cash-flow-branch"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Branch
                </label>
                <select
                  id="cash-flow-branch"
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
                  htmlFor="cash-flow-from"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  From
                </label>
                <input
                  id="cash-flow-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cash-flow-to"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  To
                </label>
                <input
                  id="cash-flow-to"
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
              Cash movements are calculated from{" "}
              {formatDateLabel(appliedFilters.from)} through{" "}
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
              title="Total Cash Inflows"
              value={response.inflows.total}
              subtitle="Customer collections and other receipts"
              icon={ArrowDownLeft}
              tone="blue"
            />
            <SummaryCard
              title="Total Cash Outflows"
              value={response.outflows.total}
              subtitle="Supplier payments, expenses, refunds, and petty cash"
              icon={ArrowUpRight}
              tone="amber"
            />
            <SummaryCard
              title="Net Cash Flow"
              value={response.netCashFlow}
              subtitle={
                isPositiveCashFlow
                  ? "Cash inflows exceed or equal outflows"
                  : "Cash outflows exceed inflows"
              }
              icon={isPositiveCashFlow ? TrendingUp : TrendingDown}
              tone="emerald"
            />
            <SummaryCard
              title="Transactions Reviewed"
              value={response.transactionCount + response.pettyCashExpenseCount}
              subtitle={`${response.transactionCount} cash/bank movements and ${response.pettyCashExpenseCount} posted petty cash vouchers`}
              icon={FileText}
              tone="violet"
              format="number"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Cash Flow Details
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
                  isPositiveCashFlow
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                {isPositiveCashFlow ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {isPositiveCashFlow
                  ? "Positive net cash flow"
                  : "Negative net cash flow"}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-700">
                  Generating cash flow report…
                </p>
                <p className="text-xs text-slate-500">
                  Summarizing customer receipts, supplier payments, refunds, and
                  expenses.
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-40 items-center justify-center px-6 py-10 text-center">
                <p className="max-w-md text-sm text-slate-500">
                  Cash flow details are unavailable until the report loads
                  successfully.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                <StatementSection
                  title="Cash Inflows"
                  description="Cash and bank receipts included in the selected period."
                  rows={inflowRows}
                />
                <StatementSection
                  title="Cash Outflows"
                  description="Recorded cash outflows and posted petty cash expenses in the selected period."
                  rows={outflowRows}
                />
                <div className="flex flex-col gap-3 bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-bold">Net Cash Flow</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      Total cash inflows less total cash outflows.
                    </p>
                  </div>
                  <p
                    className={`font-mono text-xl font-bold tabular-nums ${netCashFlow < 0 ? "text-rose-300" : "text-emerald-300"}`}
                  >
                    {formatCurrency(response.netCashFlow)}
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  How this cash flow report is calculated
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-900/80">
                  Customer payments and other receipts are counted as inflows.
                  Supplier payments, cash/bank transactions explicitly recorded
                  as Expense, customer refunds, and posted petty cash vouchers
                  are counted as outflows. Petty cash replenishments are
                  excluded from the totals because they represent funding
                  transfers, not an additional expense. This report follows the
                  current recorded transaction categories; it is not a full
                  indirect-method statement of cash flows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          aside,
          nav,
          button,
          a[href="/reports"] {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          main > div {
            max-width: none !important;
          }
          section,
          .rounded-2xl {
            break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
