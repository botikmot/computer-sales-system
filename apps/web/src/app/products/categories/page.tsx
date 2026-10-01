"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FolderTree,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getProductCategories,
  type ProductCategory,
} from "@/features/products/categories-api";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortBy = "name" | "isActive" | "createdAt";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<StatusFilter>("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const result = await getProductCategories({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status,
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setCategories(result.items);
        setPagination(result.pagination);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load categories.",
        );
        setLoading(false);
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search, status, sortBy, sortOrder]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    const nextSearch = searchInput.trim();

    setSearch(nextSearch);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleClear() {
    setLoading(true);
    setSearchInput("");
    setSearch("");
    setStatus("ALL");

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(nextStatus: StatusFilter) {
    if (nextStatus === status) {
      return;
    }

    setLoading(true);
    setStatus(nextStatus);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortBy(nextSortBy: SortBy) {
    if (nextSortBy === sortBy) {
      return;
    }

    setLoading(true);
    setSortBy(nextSortBy);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleSortOrder(nextOrder: "asc" | "desc") {
    if (nextOrder === sortOrder) {
      return;
    }

    setLoading(true);
    setSortOrder(nextOrder);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handlePageChange(page: number) {
    if (page < 1 || page > pagination.pages || page === pagination.page) {
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
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Product Categories
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage product categories used to organize inventory and products.
            </p>
          </div>

          <Link
            href="/products/categories/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Category
          </Link>
        </section>

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1 sm:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search category..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                Search
              </button>

              {(search || status !== "ALL") && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Status */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { value: "ALL" as const, label: "All" },
                  { value: "ACTIVE" as const, label: "Active" },
                  { value: "INACTIVE" as const, label: "Inactive" },
                ].map((option) => {
                  const selected = status === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleStatusChange(option.value)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                        selected
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    value={sortBy}
                    onChange={(event) =>
                      handleSortBy(event.target.value as SortBy)
                    }
                    className="h-10 min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="name">Category Name</option>
                    <option value="isActive">Status</option>
                    <option value="createdAt">Created Date</option>
                  </select>
                </div>

                <select
                  value={sortOrder}
                  onChange={(event) =>
                    handleSortOrder(event.target.value as "asc" | "desc")
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </form>
        </section>

        {/* Records */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Category Records
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>
            </div>

            <div className="text-xs text-slate-400">
              {pagination.pages > 0
                ? `Page ${pagination.page} of ${pagination.pages}`
                : "No records"}
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading categories...
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderTree className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No categories found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Try a different search or create a new category.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Products</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="right">Action</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <FolderTree className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {category.name}
                            </p>

                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {category.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {category._count?.products ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
                            category.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {category.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/products/categories/${category.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/20 hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Showing {showingFrom}–{showingTo} of {pagination.total}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
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
                  disabled={pagination.page >= pagination.pages}
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
  children: ReactNode;
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
