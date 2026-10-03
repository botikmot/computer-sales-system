"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus2,
  Loader2,
  Search,
  Wrench,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  getServiceJobs,
  type ServiceJob,
  type ServiceJobListResponse,
  type ServiceJobStatus,
} from "@/features/service-repair/service-jobs-api";

const PAGE_SIZE = 10;

type SortBy = "jobNo" | "status" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

const statusOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All Statuses",
    description: "Show all service jobs",
  },
  {
    value: "DRAFT",
    label: "Draft",
    description: "New service jobs",
  },
  {
    value: "DIAGNOSING",
    label: "Diagnosing",
    description: "Under diagnosis",
  },
  {
    value: "AWAITING_APPROVAL",
    label: "Awaiting Approval",
    description: "Waiting for customer approval",
  },
  {
    value: "APPROVED",
    label: "Approved",
    description: "Customer approved the repair",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    description: "Repair is currently ongoing",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    description: "Repair completed",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Service job cancelled",
  },
];

const sortByOptions: SelectOption[] = [
  {
    value: "jobNo",
    label: "Job No.",
    description: "Sort by service job number",
  },
  {
    value: "status",
    label: "Status",
    description: "Sort by service job status",
  },
  {
    value: "createdAt",
    label: "Created Date",
    description: "Sort by creation date",
  },
  {
    value: "updatedAt",
    label: "Updated Date",
    description: "Sort by last update",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "Oldest / A → Z",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Newest / Z → A",
  },
];

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

function getCustomerName(job: ServiceJob) {
  return job.customer.name?.trim() || job.customer.code || "Customer";
}

function getStatusClasses(status: ServiceJobStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500";

    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700";

    case "APPROVED":
      return "bg-violet-50 text-violet-700";

    case "AWAITING_APPROVAL":
      return "bg-amber-50 text-amber-700";

    case "DIAGNOSING":
      return "bg-cyan-50 text-cyan-700";

    case "DRAFT":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: ServiceJobStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ServiceJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [jobs, setJobs] = useState<ServiceJob[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        const result: ServiceJobListResponse = await getServiceJobs({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: status === "ALL" ? undefined : (status as ServiceJobStatus),
          sortBy,
          sortOrder,
        });

        if (cancelled) return;

        setJobs(result.data);
        setPagination({
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        });
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Unable to load service jobs.",
        );
        setLoading(false);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, status, sortBy, sortOrder]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setError("");
    setLoading(true);
    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleClearSearch() {
    setError("");
    setLoading(true);
    setSearchInput("");
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(value: string) {
    if (value === status) return;

    setError("");
    setLoading(true);
    setStatus(value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortByChange(value: string) {
    const nextValue = value as SortBy;

    if (nextValue === sortBy) return;

    setError("");
    setLoading(true);
    setSortBy(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrderChange(value: string) {
    const nextValue = value as SortOrder;

    if (nextValue === sortOrder) return;

    setError("");
    setLoading(true);
    setSortOrder(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handlePageChange(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setError("");
    setLoading(true);

    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  const showingFrom =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Services</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Service Jobs
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage repair jobs, diagnosis, customer approval, technicians,
              parts, and completion.
            </p>
          </div>

          <Link
            href="/service-jobs/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <FilePlus2 className="h-4 w-4" />
            New Service Job
          </Link>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">Unable to load service jobs</p>

              <p className="mt-0.5 break-words">{error}</p>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search job no., customer, technician, diagnosis..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Search
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-3 xl:w-[620px]">
              <SearchableSelect
                value={status}
                onChange={handleStatusChange}
                options={statusOptions}
                placeholder="Status"
                searchPlaceholder="Search status..."
                emptyMessage="No status found."
                disabled={loading && !jobs.length}
              />

              <SearchableSelect
                value={sortBy}
                onChange={handleSortByChange}
                options={sortByOptions}
                placeholder="Sort by"
                searchPlaceholder="Search sort field..."
                emptyMessage="No sort field found."
                disabled={loading && !jobs.length}
              />

              <SearchableSelect
                value={sortOrder}
                onChange={handleSortOrderChange}
                options={sortOrderOptions}
                placeholder="Sort order"
                searchPlaceholder="Search sort order..."
                emptyMessage="No sort order found."
                disabled={loading && !jobs.length}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">
                Service Job Records
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>
            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
              <Wrench className="h-4 w-4" />
              Repair operations
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading service jobs...
              </div>
            </div>
          ) : jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Job No.
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Technician
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Parts
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Labor
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/service-jobs/${job.id}`}
                          className="font-mono text-sm font-semibold text-primary hover:text-blue-700"
                        >
                          {job.jobNo}
                        </Link>

                        <p className="mt-1 text-xs text-slate-400">
                          {job.branch.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[190px] truncate text-sm font-semibold text-slate-800">
                          {getCustomerName(job)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {job.customer.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[170px] truncate text-sm font-medium text-slate-700">
                          {job.technician?.fullName || "Unassigned"}
                        </p>

                        {job.technician && (
                          <p className="mt-1 text-xs text-slate-400">
                            {job.technician.username}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {job.parts.length}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="font-mono text-sm font-semibold text-slate-800">
                          ₱
                          {Number(job.laborCharge || 0).toLocaleString(
                            "en-PH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClasses(
                            job.status,
                          )}`}
                        >
                          {job.status === "COMPLETED" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}

                          {formatStatus(job.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(job.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/service-jobs/${job.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Wrench className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                No service jobs found
              </p>

              <p className="mt-1 max-w-md text-xs text-slate-400">
                {search || status !== "ALL"
                  ? "Try changing your search or status filter."
                  : "Create your first service job to begin tracking repairs."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={
                  loading || pagination.page <= 1 || pagination.totalPages <= 1
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-white">
                {pagination.page}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={
                  loading ||
                  pagination.page >= pagination.totalPages ||
                  pagination.totalPages <= 1
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
