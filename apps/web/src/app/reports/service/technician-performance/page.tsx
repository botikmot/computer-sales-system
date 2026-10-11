"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import {
  getTechnicianPerformance,
  type TechnicianPerformanceResponse,
} from "@/features/reports/reports-api";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type Filters = {
  branchId: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  branchId: "",
  from: "",
  to: "",
};

function formatCurrency(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function TechnicianPerformanceReportPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [report, setReport] = useState<TechnicianPerformanceResponse | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        const result = await getBranches();

        if (!cancelled) {
          setBranches(result.filter((branch) => branch.isActive));
          setBranchesError("");
        }
      } catch (err) {
        if (!cancelled) {
          setBranchesError(
            err instanceof Error ? err.message : "Unable to load branches.",
          );
        }
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const result = await getTechnicianPerformance({
          page,
          limit,
          branchId: appliedFilters.branchId || undefined,
          from: appliedFilters.from || undefined,
          to: appliedFilters.to || undefined,
        });

        if (!cancelled) {
          setReport(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load technician performance.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [page, limit, appliedFilters, refreshKey]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filters.from && filters.to && filters.from > filters.to) {
      setError("From date cannot be after To date.");
      return;
    }

    setError("");
    setLoading(true);
    setPage(1);
    setAppliedFilters({ ...filters });
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setError("");
    setLoading(true);
    setPage(1);
    setRefreshKey((current) => current + 1);
  }

  function refreshReport() {
    setError("");
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function changePage(nextPage: number) {
    const pages = report?.pagination.pages ?? 0;

    if (nextPage < 1 || nextPage > pages) return;

    setLoading(true);
    setPage(nextPage);
  }

  function changePageSize(value: string) {
    const nextLimit = Number(value);

    if (!PAGE_SIZE_OPTIONS.includes(nextLimit)) return;

    setLoading(true);
    setPage(1);
    setLimit(nextLimit);
  }

  const totals = report?.totals;
  const totalTechnicians = report?.pagination.total ?? report?.count ?? 0;
  const pages = report?.pagination.pages ?? 0;
  const startRecord = totalTechnicians === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalTechnicians);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Reports Center
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Award className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-primary">
                  Service / Repair
                </p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Technician Performance / Job Summary
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Compare assigned workloads, completed repairs, active jobs,
                  and posted service revenue by technician.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshReport}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Technicians
              </p>
              <Award className="h-5 w-5 text-violet-600" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {loading && !report
                ? "—"
                : (totals?.totalTechnicians ?? 0).toLocaleString("en-PH")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              With matching assigned jobs
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Jobs
              </p>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {loading && !report
                ? "—"
                : (totals?.totalJobs ?? 0).toLocaleString("en-PH")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across all matching technicians
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Completed Jobs
              </p>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {loading && !report
                ? "—"
                : (totals?.completedJobs ?? 0).toLocaleString("en-PH")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Jobs with COMPLETED status
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Completion Rate
              </p>
              <FileBarChart className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {loading && !report
                ? "—"
                : `${(totals?.completionRate ?? 0).toFixed(2)}%`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Completed jobs ÷ total jobs
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service Revenue
              </p>
              <Wrench className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">
              {loading && !report
                ? "—"
                : formatCurrency(totals?.serviceRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              From posted service invoices
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              Report Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter by service-job creation date and branch.
            </p>
          </div>

          <form onSubmit={applyFilters} className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  From Date
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  To Date
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Branch
                </span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={filters.branchId}
                    disabled={branchesLoading}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        branchId: event.target.value,
                      }))
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                  >
                    <option value="">All accessible branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.code} — {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply Filters
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </div>

            {branchesError && (
              <p className="mt-3 text-sm text-amber-700">
                Branch options could not be loaded: {branchesError}
              </p>
            )}
          </form>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Unable to load Technician Performance
              </p>
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
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Technician Job Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                One row per technician. Summary cards reflect all matching
                records, not only the current page.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {totalTechnicians === 0
                ? "No records"
                : `Showing ${startRecord}–${endRecord} of ${totalTechnicians}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3 text-right">Total Jobs</th>
                  <th className="px-5 py-3 text-right">Completed</th>
                  <th className="px-5 py-3 text-right">Active</th>
                  <th className="px-5 py-3 text-right">Cancelled</th>
                  <th className="px-5 py-3">Completion Rate</th>
                  <th className="px-5 py-3 text-right">Service Revenue</th>
                  <th className="px-5 py-3">Account Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {report?.technicians.map((item) => (
                  <tr
                    key={item.technician.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {item.technician.fullName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        @{item.technician.username}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-800">
                      {item.totalJobs}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-emerald-700">
                      {item.completedJobs}
                    </td>

                    <td className="px-5 py-4 text-right font-medium tabular-nums text-blue-700">
                      {item.activeJobs}
                    </td>

                    <td className="px-5 py-4 text-right font-medium tabular-nums text-rose-700">
                      {item.cancelledJobs}
                    </td>

                    <td className="min-w-48 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold tabular-nums text-slate-800">
                          {item.completionRate.toFixed(2)}%
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.completedJobs}/{item.totalJobs}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, item.completionRate),
                            )}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                      {formatCurrency(item.serviceRevenue)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.technician.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabel(item.technician.status)}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">
                        {statusLabel(item.technician.role)}
                      </p>
                    </td>
                  </tr>
                ))}

                {!loading &&
                  !error &&
                  (report?.technicians.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Award className="h-6 w-6" />
                        </div>
                        <p className="mt-3 font-semibold text-slate-800">
                          No technician performance records found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try a different date range or branch. Technicians
                          appear when they have matching assigned jobs.
                        </p>
                      </td>
                    </tr>
                  )}

                {loading && !report && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading technician performance...
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>
                Page {pages === 0 ? 0 : page} of {pages}
              </span>

              <label className="flex items-center gap-2">
                <span className="text-xs">Rows</span>
                <select
                  value={limit}
                  onChange={(event) => changePageSize(event.target.value)}
                  disabled={loading}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-primary"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={loading || page <= 1 || pages === 0}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={loading || page >= pages || pages === 0}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
