"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  RefreshCw,
  Printer,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getArApAging,
  type ArApAgingResponse,
  type ManagementAgingBucketValues,
  type ManagementAgingPagination,
  type ManagementAgingRecord,
} from "@/features/reports/reports-api";

type AgingFilters = {
  branchId: string;
  asOfDate: string;
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DAY_MS = 24 * 60 * 60 * 1000;

function getLocalDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialAsOfDate = getLocalDateInputValue();

function emptySection() {
  return {
    count: 0,
    total: 0,
    aging: {
      current: 0,
      "1_30": 0,
      "31_60": 0,
      "61_90": 0,
      "91_plus": 0,
      noDueDate: 0,
    },
    records: [] as ManagementAgingRecord[],
    pagination: {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      total: 0,
      pages: 1,
    },
  };
}

const initialResponse: ArApAgingResponse = {
  asOfDate: "",
  accountsReceivable: emptySection(),
  accountsPayable: emptySection(),
};

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

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDateLabel(value?: string | null) {
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

function agingDetails(dueDate: string | null, asOfDate: string) {
  if (!dueDate) {
    return {
      label: "No due date",
      days: null as number | null,
      tone: "slate" as const,
    };
  }

  const cutoff = new Date(`${asOfDate}T23:59:59.999Z`);
  const due = new Date(dueDate);
  if (Number.isNaN(cutoff.getTime()) || Number.isNaN(due.getTime())) {
    return {
      label: "Unknown",
      days: null as number | null,
      tone: "slate" as const,
    };
  }

  const diffMs = cutoff.getTime() - due.getTime();
  if (diffMs <= 0) {
    return { label: "Current", days: 0, tone: "emerald" as const };
  }

  const days = Math.floor(diffMs / DAY_MS);
  if (days <= 30) return { label: "1–30 days", days, tone: "amber" as const };
  if (days <= 60) return { label: "31–60 days", days, tone: "orange" as const };
  if (days <= 90) return { label: "61–90 days", days, tone: "rose" as const };
  return { label: "91+ days", days, tone: "red" as const };
}

function sumAging(
  aging: ManagementAgingBucketValues,
  keys: (keyof ManagementAgingBucketValues)[],
) {
  return keys.reduce((sum, key) => sum + toNumber(aging[key]), 0);
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "emerald" | "violet";
}) {
  const toneClasses = {
    blue: { icon: "bg-blue-50 text-blue-700", value: "text-slate-950" },
    amber: { icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
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
            {value}
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

const agingRows: {
  key: keyof ManagementAgingBucketValues;
  label: string;
  hint: string;
}[] = [
  { key: "current", label: "Current", hint: "Not overdue" },
  { key: "1_30", label: "1–30 days", hint: "Up to 30 days overdue" },
  { key: "31_60", label: "31–60 days", hint: "31 to 60 days overdue" },
  { key: "61_90", label: "61–90 days", hint: "61 to 90 days overdue" },
  { key: "91_plus", label: "91+ days", hint: "More than 90 days overdue" },
  {
    key: "noDueDate",
    label: "No due date",
    hint: "No payment due date recorded",
  },
];

function AgingSummary({
  title,
  subtitle,
  aging,
  total,
}: {
  title: string;
  subtitle: string;
  aging: ManagementAgingBucketValues;
  total: string | number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {agingRows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{row.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{row.hint}</p>
            </div>
            <p className="whitespace-nowrap text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
              {formatCurrency(aging[row.key])}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4">
        <span className="text-sm font-bold text-slate-800">
          Total outstanding
        </span>
        <span className="whitespace-nowrap font-mono text-sm font-bold tabular-nums text-slate-950">
          {formatCurrency(total)}
        </span>
      </div>
    </section>
  );
}

function AgingRecordsTable({
  title,
  subtitle,
  partyField,
  icon: Icon,
  records,
  count,
  total,
  pagination,
  loading,
  pageSize,
  asOfDate,
  onPageChange,
  onPageSizeChange,
}: {
  title: string;
  subtitle: string;
  partyField: "customer" | "supplier";
  icon: LucideIcon;
  records: ManagementAgingRecord[];
  count: number;
  total: string | number;
  pagination: ManagementAgingPagination;
  loading: boolean;
  pageSize: number;
  asOfDate: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}) {
  const pages = Math.max(1, pagination.pages || 1);
  const firstItem =
    count === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, count);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            <p className="mt-1 text-xs text-slate-500">
              Showing {firstItem}–{lastItem} of {formatNumber(count)} records ·
              Total outstanding {formatCurrency(total)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor={`${partyField}-aging-page-size`}
            className="whitespace-nowrap text-xs font-medium text-slate-500"
          >
            Rows per page
          </label>
          <select
            id={`${partyField}-aging-page-size`}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={loading}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3 font-semibold">
                {partyField === "customer" ? "Customer" : "Supplier"}
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Original Amount
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Amount Paid
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Balance Due
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Due Date
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                Aging
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-14 text-center text-sm text-slate-500"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />{" "}
                    Loading aging records…
                  </span>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-14 text-center text-sm text-slate-500"
                >
                  No outstanding{" "}
                  {partyField === "customer" ? "receivable" : "payable"} records
                  found for this scope.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const party = record[partyField];
                const aging = agingDetails(record.dueDate, asOfDate);
                const statusClass =
                  record.status === "PARTIALLY_PAID"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700";
                const agingClass = {
                  slate: "bg-slate-100 text-slate-700",
                  emerald: "bg-emerald-50 text-emerald-700",
                  amber: "bg-amber-50 text-amber-700",
                  orange: "bg-orange-50 text-orange-700",
                  rose: "bg-rose-50 text-rose-700",
                  red: "bg-red-50 text-red-700",
                }[aging.tone];

                return (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {party?.name || "Unknown party"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {party?.code || record.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                      >
                        {record.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                      {formatCurrency(record.originalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                      {formatCurrency(record.amountPaid)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-950">
                      {formatCurrency(record.balanceDue)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDateLabel(record.dueDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${agingClass}`}
                      >
                        {aging.label}
                      </span>
                      {aging.days !== null && aging.days > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {aging.days} days overdue
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {count === 0
            ? "0 records"
            : `Showing ${firstItem}–${lastItem} of ${count} records`}
        </p>
        <div className="flex items-center justify-end gap-2">
          <span className="mr-1 text-xs font-medium text-slate-500">
            Page {Math.min(pagination.page, pages)} of {pages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={loading || pagination.page <= 1}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={loading || pagination.page >= pages || count === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ArApAgingPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [asOfDate, setAsOfDate] = useState(initialAsOfDate);
  const [appliedFilters, setAppliedFilters] = useState<AgingFilters>({
    branchId: "",
    asOfDate: initialAsOfDate,
  });
  const [arPage, setArPage] = useState(1);
  const [apPage, setApPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [response, setResponse] = useState<ArApAgingResponse>(initialResponse);
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
        setBranchesError("");
      } catch (loadError: unknown) {
        if (!active) return;
        setBranchesError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load branch options.",
        );
      } finally {
        if (active) setBranchesLoading(false);
      }
    }

    void loadBranches();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAgingReport() {
      try {
        const result = await getArApAging({
          ...(appliedFilters.branchId
            ? { branchId: appliedFilters.branchId }
            : {}),
          asOfDate: appliedFilters.asOfDate,
          arPage,
          apPage,
          limit: pageSize,
        });
        if (!active) return;

        setResponse(result);
        setError("");
        if (result.accountsReceivable.pagination.page !== arPage) {
          setArPage(result.accountsReceivable.pagination.page);
        }
        if (result.accountsPayable.pagination.page !== apPage) {
          setApPage(result.accountsPayable.pagination.page);
        }
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the A/R and A/P aging report.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAgingReport();
    return () => {
      active = false;
    };
  }, [appliedFilters, arPage, apPage, pageSize, refreshKey]);

  const activeBranches = branches.filter((branch) => branch.isActive);
  const selectedBranch = activeBranches.find(
    (branch) => branch.id === appliedFilters.branchId,
  );
  const ar = response.accountsReceivable;
  const ap = response.accountsPayable;
  const overdueKeys: (keyof ManagementAgingBucketValues)[] = [
    "1_30",
    "31_60",
    "61_90",
    "91_plus",
  ];
  const totalOverdueAr = sumAging(ar.aging, overdueKeys);
  const totalOverdueAp = sumAging(ap.aging, overdueKeys);

  function applyFilters() {
    if (!asOfDate) {
      setError("Please select an as-of date.");
      return;
    }
    setLoading(true);
    setError("");
    setArPage(1);
    setApPage(1);
    setAppliedFilters({ branchId, asOfDate });
    setRefreshKey((current) => current + 1);
  }

  function resetFilters() {
    const today = getLocalDateInputValue();
    setBranchId("");
    setAsOfDate(today);
    setLoading(true);
    setError("");
    setArPage(1);
    setApPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setAppliedFilters({ branchId: "", asOfDate: today });
    setRefreshKey((current) => current + 1);
  }

  function refreshReport() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  function changeArPage(nextPage: number) {
    const maxPages = Math.max(1, ar.pagination.pages || 1);
    const safePage = Math.min(maxPages, Math.max(1, nextPage));
    if (safePage === arPage) return;
    setLoading(true);
    setError("");
    setArPage(safePage);
  }

  function changeApPage(nextPage: number) {
    const maxPages = Math.max(1, ap.pagination.pages || 1);
    const safePage = Math.min(maxPages, Math.max(1, nextPage));
    if (safePage === apPage) return;
    setLoading(true);
    setError("");
    setApPage(safePage);
  }

  function changePageSize(nextPageSize: number) {
    if (nextPageSize === pageSize) return;
    setLoading(true);
    setError("");
    setArPage(1);
    setApPage(1);
    setPageSize(nextPageSize);
  }

  return (
    <AppShell>
      <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 print:hidden"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Reports Center
          </Link>

          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <ClipboardList className="h-3.5 w-3.5" /> Management / Financial
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                A/R and A/P Aging Report
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review outstanding customer receivables and supplier payables by
                aging bucket, with separately paginated detail tables.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                type="button"
                onClick={refreshReport}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}{" "}
                Refresh
              </button>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">
                Report Filters
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <div>
                <label
                  htmlFor="ar-ap-aging-branch"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Branch
                </label>
                <select
                  id="ar-ap-aging-branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  disabled={branchesLoading}
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
                  htmlFor="ar-ap-aging-asof"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  As of Date
                </label>
                <input
                  id="ar-ap-aging-asof"
                  type="date"
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={loading || branchesLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:min-w-36"
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}{" "}
                  Apply
                </button>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 lg:min-w-20"
                >
                  Reset
                </button>
              </div>
            </div>
            {branchesError ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Branch options could not be loaded: {branchesError}
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Aging is grouped against{" "}
              {formatDateLabel(appliedFilters.asOfDate)}
              {selectedBranch
                ? ` for ${selectedBranch.name}`
                : " across all accessible branches"}
              . This report uses currently outstanding balances; historical
              paid/open balances are not reconstructed.
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
              title="Total A/R Outstanding"
              value={formatCurrency(ar.total)}
              subtitle={`${formatNumber(ar.count)} open or partially paid receivable records`}
              icon={Users}
              tone="blue"
            />
            <SummaryCard
              title="Total A/P Outstanding"
              value={formatCurrency(ap.total)}
              subtitle={`${formatNumber(ap.count)} open or partially paid payable records`}
              icon={Truck}
              tone="amber"
            />
            <SummaryCard
              title="Overdue Receivables"
              value={formatCurrency(totalOverdueAr)}
              subtitle="Receivables in the 1–30, 31–60, 61–90 and 91+ day buckets"
              icon={ArrowDownRight}
              tone="violet"
            />
            <SummaryCard
              title="Overdue Payables"
              value={formatCurrency(totalOverdueAp)}
              subtitle="Payables in the 1–30, 31–60, 61–90 and 91+ day buckets"
              icon={ArrowUpRight}
              tone="emerald"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AgingSummary
              title="Accounts Receivable Aging"
              subtitle="Outstanding customer balances by due-date age."
              aging={ar.aging}
              total={ar.total}
            />
            <AgingSummary
              title="Accounts Payable Aging"
              subtitle="Outstanding supplier balances by due-date age."
              aging={ap.aging}
              total={ap.total}
            />
          </div>

          <div className="space-y-6">
            <AgingRecordsTable
              title="Accounts Receivable Details"
              subtitle="Open and partially paid customer balances."
              partyField="customer"
              icon={Users}
              records={ar.records}
              count={ar.count}
              total={ar.total}
              pagination={ar.pagination}
              loading={loading}
              pageSize={pageSize}
              asOfDate={appliedFilters.asOfDate}
              onPageChange={changeArPage}
              onPageSizeChange={changePageSize}
            />
            <AgingRecordsTable
              title="Accounts Payable Details"
              subtitle="Open and partially paid supplier balances."
              partyField="supplier"
              icon={Truck}
              records={ap.records}
              count={ap.count}
              total={ap.total}
              pagination={ap.pagination}
              loading={loading}
              pageSize={pageSize}
              asOfDate={appliedFilters.asOfDate}
              onPageChange={changeApPage}
              onPageSizeChange={changePageSize}
            />
          </div>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5 print:hidden">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  How aging is calculated
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Each outstanding balance is grouped by the difference between
                  its due date and the selected as-of date: Current, 1–30,
                  31–60, 61–90, 91+ days, or No Due Date. Summary amounts cover
                  every matching outstanding record. Detail rows are fetched
                  page-by-page from the database.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          button,
          select,
          input[type="date"] {
            display: none !important;
          }
          section {
            break-inside: avoid;
            box-shadow: none !important;
          }
          table {
            font-size: 9px !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
