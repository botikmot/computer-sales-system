"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSuppliers,
  type Supplier,
  type SupplierListResponse,
} from "@/features/purchasing/suppliers-api";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

const PAGE_SIZE = 10;

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

type SortBy =
  "code" | "name" | "contactPerson" | "contactNumber" | "email" | "createdAt";

const sortByOptions: SelectOption[] = [
  {
    value: "code",
    label: "Supplier Code",
    description: "Sort by supplier code",
  },
  {
    value: "name",
    label: "Supplier Name",
    description: "Sort alphabetically by supplier name",
  },
  {
    value: "contactPerson",
    label: "Contact Person",
    description: "Sort by contact person",
  },
  {
    value: "contactNumber",
    label: "Contact Number",
    description: "Sort by contact number",
  },
  {
    value: "email",
    label: "Email",
    description: "Sort by email address",
  },
  {
    value: "createdAt",
    label: "Created Date",
    description: "Sort by supplier creation date",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "A → Z / Oldest first",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Z → A / Newest first",
  },
];

const activeFilterOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All Suppliers",
    description: "Show active and inactive suppliers",
  },
  {
    value: "ACTIVE",
    label: "Active",
    description: "Show active suppliers only",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    description: "Show inactive suppliers only",
  },
];

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

function getStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchSuppliers() {
      try {
        setLoading(true);
        setError("");

        const result: SupplierListResponse = await getSuppliers({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          isActive:
            activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setSuppliers(result.data);

        setPagination({
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        });

        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load suppliers.",
        );

        setLoading(false);
      }
    }

    void fetchSuppliers();

    return () => {
      cancelled = true;
    };
  }, [
    pagination.page,
    pagination.limit,
    search,
    activeFilter,
    sortBy,
    sortOrder,
  ]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    setLoading(true);

    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleClearSearch() {
    setSearchInput("");

    if (!search) {
      return;
    }

    setLoading(true);
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleActiveFilter(value: ActiveFilter) {
    if (value === activeFilter) {
      return;
    }

    setLoading(true);
    setActiveFilter(value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortBy(value: string) {
    const nextValue = value as SortBy;

    if (nextValue === sortBy) {
      return;
    }

    setLoading(true);
    setSortBy(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrder(value: string) {
    const nextValue = value as "asc" | "desc";

    if (nextValue === sortOrder) {
      return;
    }

    setLoading(true);
    setSortOrder(nextValue);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handlePageChange(page: number) {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) {
      return;
    }

    setLoading(true);

    setPagination((current) => ({
      ...current,
      page,
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Suppliers
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage supplier master data used across purchasing transactions.
            </p>
          </div>

          <Link
            href="/suppliers/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Supplier
          </Link>
        </div>

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="min-w-0 flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Search
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search code, name, contact, phone, or email..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-20 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-12 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Status */}
            <div className="w-full xl:w-56">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Status
              </label>

              <SearchableSelect
                value={activeFilter}
                onChange={(value) => handleActiveFilter(value as ActiveFilter)}
                options={activeFilterOptions}
                placeholder="All suppliers"
                searchPlaceholder="Search status..."
              />
            </div>

            {/* Sort By */}
            <div className="w-full xl:w-56">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Sort By
              </label>

              <SearchableSelect
                value={sortBy}
                onChange={handleSortBy}
                options={sortByOptions}
                placeholder="Select sort field"
                searchPlaceholder="Search sort field..."
              />
            </div>

            {/* Sort Order */}
            <div className="w-full xl:w-52">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Sort Order
              </label>

              <SearchableSelect
                value={sortOrder}
                onChange={handleSortOrder}
                options={sortOrderOptions}
                placeholder="Select order"
                searchPlaceholder="Search order..."
              />
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load suppliers</p>

              <p className="mt-0.5 text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Users className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Supplier Records
                </h2>

                <p className="text-xs text-slate-400">
                  {pagination.total} total supplier
                  {pagination.total === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Supplier</TableHeader>
                  <TableHeader>Contact Person</TableHeader>
                  <TableHeader>Contact Number</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Created</TableHeader>
                  <TableHeader align="right">Actions</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />

                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Loading suppliers...
                      </p>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <Users className="mx-auto h-7 w-7 text-slate-300" />

                      <p className="mt-3 text-sm font-semibold text-slate-600">
                        No suppliers found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try changing your search or status filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {supplier.code}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="block"
                        >
                          <p className="text-sm font-semibold text-slate-800">
                            {supplier.name}
                          </p>

                          {supplier.address && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                              {supplier.address}
                            </p>
                          )}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.contactPerson || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.contactNumber || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="text-sm text-slate-600 hover:text-primary hover:underline"
                          >
                            {supplier.email}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            supplier.isActive,
                          )}`}
                        >
                          {supplier.isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}

                          {supplier.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(supplier.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          View / Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white">
                  {pagination.page}
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
