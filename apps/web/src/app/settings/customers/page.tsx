"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createCustomer,
  getCustomersPage,
  updateCustomer,
  type Customer,
} from "@/features/customers/customers-api";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type SortBy = "code" | "name" | "contactNumber" | "email" | "createdAt";

const sortOptions: SelectOption[] = [
  {
    value: "name",
    label: "Name",
    description: "Sort alphabetically by customer name",
  },
  {
    value: "code",
    label: "Code",
    description: "Sort by customer code",
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
    description: "Sort by customer creation date",
  },
];

const sortOrderOptions: SelectOption[] = [
  {
    value: "asc",
    label: "Ascending",
    description: "A → Z / oldest first",
  },
  {
    value: "desc",
    label: "Descending",
    description: "Z → A / newest first",
  },
];

const statusOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All statuses",
  },
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
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

function statusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

function inputClassName() {
  return [
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3",
    "text-sm text-slate-800 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
  ].join(" ");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setLoading(true);

        const result = await getCustomersPage({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          isActive:
            statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
          sortBy,
          sortOrder,
        });

        if (cancelled) {
          return;
        }

        setCustomers(result.items);
        setPages(Math.max(result.pagination.pages, 1));
        setTotal(result.pagination.total);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setCustomers([]);
        setError(
          err instanceof Error ? err.message : "Unable to load customers.",
        );
        setLoading(false);
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, sortBy, sortOrder]);

  function resetForm() {
    setName("");
    setContactNumber("");
    setEmail("");
    setAddress("");
    setTaxId("");
    setIsActive(true);
  }

  function openCreateModal() {
    setEditingCustomer(null);
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setName(customer.name);
    setContactNumber(customer.contactNumber ?? "");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setTaxId(customer.taxId ?? "");
    setIsActive(customer.isActive);

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setEditingCustomer(null);
    resetForm();
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(value: string) {
    setPage(1);
    setStatusFilter(value as StatusFilter);
  }

  function handleSortChange(value: string) {
    setPage(1);
    setSortBy(value as SortBy);
  }

  function handleSortOrderChange(value: string) {
    setPage(1);
    setSortOrder(value as "asc" | "desc");
  }

  async function reloadCurrentPage() {
    const result = await getCustomersPage({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
      sortBy,
      sortOrder,
    });

    setCustomers(result.items);
    setPages(Math.max(result.pagination.pages, 1));
    setTotal(result.pagination.total);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        contactNumber: contactNumber.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        isActive,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        setSuccess("Customer updated successfully.");
      } else {
        await createCustomer(payload);
        setSuccess("Customer created successfully.");
      }

      setShowModal(false);
      setEditingCustomer(null);
      resetForm();

      await reloadCurrentPage();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingCustomer
            ? "Unable to update customer."
            : "Unable to create customer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(customer: Customer) {
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      await updateCustomer(customer.id, {
        isActive: !customer.isActive,
      });

      setSuccess(
        customer.isActive
          ? `${customer.name} has been deactivated.`
          : `${customer.name} is now active.`,
      );

      await reloadCurrentPage();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update customer status.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              Settings · Master Data
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Customers
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage customers used throughout sales, service, payments, and
              accounts receivable.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {(error || success) && (
          <div
            className={[
              "rounded-xl border px-4 py-3 text-sm",
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {error || success}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <form
                onSubmit={handleSearch}
                className="flex min-w-0 flex-1 gap-2"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search code, name, contact, or email..."
                    className={`${inputClassName()} pl-9`}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Search
                </button>
              </form>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[700px]">
                <SearchableSelect
                  value={statusFilter}
                  onChange={handleStatusChange}
                  options={statusOptions}
                  placeholder="All statuses"
                  searchPlaceholder="Search status..."
                  emptyMessage="No status found."
                />

                <SearchableSelect
                  value={sortBy}
                  onChange={handleSortChange}
                  options={sortOptions}
                  placeholder="Sort by"
                  searchPlaceholder="Search sort field..."
                  emptyMessage="No sort field found."
                />

                <SearchableSelect
                  value={sortOrder}
                  onChange={handleSortOrderChange}
                  options={sortOrderOptions}
                  placeholder="Sort order"
                  searchPlaceholder="Search sort order..."
                  emptyMessage="No sort order found."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Customer Records
              </p>

              <p className="text-xs text-slate-400">
                Showing {showingFrom}–{showingTo} of {total}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void reloadCurrentPage()}
              disabled={loading || submitting}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-40"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Address
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Tax ID
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Created
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />

                        <p className="text-sm">Loading customers...</p>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <UserRound className="h-7 w-7" />

                        <p className="text-sm font-medium text-slate-600">
                          No customers found.
                        </p>

                        <p className="text-xs text-slate-400">
                          Try another search or add a new customer.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer.name}
                        </p>

                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          {customer.code}
                        </p>

                        {customer.email && (
                          <p className="mt-1 text-xs text-slate-400">
                            {customer.email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.contactNumber || "—"}
                      </td>

                      <td className="max-w-[250px] px-5 py-4 text-slate-500">
                        <span className="line-clamp-2">
                          {customer.address || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {customer.taxId || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusClass(customer.isActive),
                          ].join(" ")}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            disabled={submitting}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(customer)}
                            disabled={submitting}
                            className={[
                              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                              customer.isActive
                                ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300",
                              "disabled:cursor-not-allowed disabled:opacity-40",
                            ].join(" ")}
                          >
                            {customer.isActive ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}

                            {customer.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Showing {showingFrom}–{showingTo} of {total}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white">
                  {page}
                </span>

                <button
                  type="button"
                  disabled={page >= pages || loading}
                  onClick={() => setPage((value) => value + 1)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingCustomer
                    ? "Update the customer master record."
                    : "Create a customer master record."}
                </p>
                {editingCustomer && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer Code
                    </p>

                    <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                      {editingCustomer.code}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div className="">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Customer Name <span className="text-red-500">*</span>
                  </span>

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClassName()}
                    placeholder="e.g. Juan Dela Cruz"
                    maxLength={200}
                    required
                    disabled={submitting}
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Contact Number
                  </span>

                  <input
                    value={contactNumber}
                    onChange={(event) => setContactNumber(event.target.value)}
                    className={inputClassName()}
                    placeholder="e.g. 0917 123 4567"
                    maxLength={50}
                    disabled={submitting}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClassName()}
                    placeholder="customer@example.com"
                    maxLength={200}
                    disabled={submitting}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Address
                </span>

                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  placeholder="Customer address"
                  maxLength={1000}
                  disabled={submitting}
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tax ID
                  </span>

                  <input
                    value={taxId}
                    onChange={(event) => setTaxId(event.target.value)}
                    className={inputClassName()}
                    placeholder="e.g. TIN"
                    maxLength={100}
                    disabled={submitting}
                  />
                </label>

                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Status
                  </span>

                  <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      disabled={submitting}
                      className="h-4 w-4 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-700">
                      Active customer
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}

                  {submitting
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
