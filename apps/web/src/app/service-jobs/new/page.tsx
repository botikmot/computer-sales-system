"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  X,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import { getCustomers } from "@/features/customers/customers-api";

import {
  createSalesCustomer,
  type CustomerRecord,
} from "@/features/sales/sales-api";

import { createServiceJob } from "@/features/service-repair/service-jobs-api";

function getCustomerDisplayName(customer: CustomerRecord) {
  return customer.name?.trim() || customer.code;
}

export default function NewServiceJobPage() {
  const router = useRouter();

  const currentUser = getCurrentUser();

  const canQuickCreateCustomer =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "MANAGER" ||
    currentUser?.role === "SALES" ||
    currentUser?.role === "TECHNICIAN";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [customerSaving, setCustomerSaving] = useState(false);

  const [customerModalError, setCustomerModalError] = useState("");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    contactNumber: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const [branchResult, customerResult] = await Promise.all([
          getBranches(),
          getCustomers(),
        ]);

        if (cancelled) {
          return;
        }

        setBranches(branchResult);
        setCustomers(customerResult);
        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load service job options.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeBranches = branches.filter((branch) => branch.isActive);

  const activeCustomers = customers.filter((customer) => customer.isActive);

  const selectedBranch =
    activeBranches.find((branch) => branch.id === branchId) ?? null;

  const selectedCustomer =
    activeCustomers.find((customer) => customer.id === customerId) ?? null;

  const branchOptions: SelectOption[] = activeBranches.map((branch) => ({
    value: branch.id,
    label: branch.name,
    description: branch.code,
  }));

  const customerOptions: SelectOption[] = activeCustomers.map((customer) => ({
    value: customer.id,
    label: getCustomerDisplayName(customer),
    description: `${customer.code}${
      customer.contactNumber ? ` • ${customer.contactNumber}` : ""
    }`,
  }));

  function handleBranchChange(value: string) {
    setBranchId(value);
  }

  function handleCustomerChange(value: string) {
    setCustomerId(value);
  }

  function openQuickCreateCustomer() {
    if (!canQuickCreateCustomer) {
      return;
    }

    setCustomerForm({
      name: "",
      contactNumber: "",
      email: "",
      address: "",
    });

    setCustomerModalError("");
    setShowCustomerModal(true);
  }

  function closeQuickCreateCustomer() {
    if (customerSaving) {
      return;
    }

    setShowCustomerModal(false);
    setCustomerModalError("");
  }

  async function handleQuickCreateCustomer(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canQuickCreateCustomer) {
      return;
    }

    const name = customerForm.name.trim();

    if (!name) {
      setCustomerModalError("Customer name is required.");
      return;
    }

    try {
      setCustomerSaving(true);
      setCustomerModalError("");

      const created = await createSalesCustomer({
        name,
        contactNumber: customerForm.contactNumber.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        address: customerForm.address.trim() || undefined,
      });

      setCustomers((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );

      setCustomerId(created.id);

      setShowCustomerModal(false);
      setCustomerForm({
        name: "",
        contactNumber: "",
        email: "",
        address: "",
      });
    } catch (err) {
      setCustomerModalError(
        err instanceof Error ? err.message : "Unable to create customer.",
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError("");

    if (!branchId) {
      setSubmitError("Please select a branch.");
      return;
    }

    if (!customerId) {
      setSubmitError("Please select a customer.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await createServiceJob({
        branchId,
        customerId,
        notes: notes.trim() || undefined,
      });

      router.push(`/service-jobs/${result.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create service job.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="w-full">
        <div className="mb-5">
          <Link
            href="/service-jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Service Jobs
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Services</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Service Job
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Create a repair job for an active customer and branch.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load service job options
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create service job</p>

              <p className="mt-1">{submitError}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading service job options...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* SERVICE JOB DETAILS */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Service Job Details
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Select the branch where the repair will be handled and the
                      customer requesting the service.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2">
                {/* BRANCH */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Branch <span className="text-red-500">*</span>
                  </label>

                  <SearchableSelect
                    value={branchId}
                    onChange={handleBranchChange}
                    options={branchOptions}
                    placeholder={
                      activeBranches.length > 0
                        ? "Search branch..."
                        : "No active branches available"
                    }
                    searchPlaceholder="Search branch..."
                    emptyMessage="No active branch found."
                    disabled={submitting || activeBranches.length === 0}
                  />

                  {selectedBranch && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                        <Building2 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {selectedBranch.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Branch Code:{" "}
                          <span className="font-medium">
                            {selectedBranch.code}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CUSTOMER */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Customer <span className="text-red-500">*</span>
                  </label>

                  <SearchableSelect
                    value={customerId}
                    onChange={handleCustomerChange}
                    options={customerOptions}
                    placeholder={
                      activeCustomers.length > 0
                        ? "Search customer..."
                        : "No active customers available"
                    }
                    searchPlaceholder="Search customer..."
                    emptyMessage="No active customer found."
                    disabled={submitting || activeCustomers.length === 0}
                    actionLabel="Add New Customer"
                    onAction={
                      canQuickCreateCustomer
                        ? openQuickCreateCustomer
                        : undefined
                    }
                  />

                  {selectedCustomer && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Customer
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                            {getCustomerDisplayName(selectedCustomer)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Customer Code
                          </p>

                          <p className="mt-1 truncate font-mono text-sm font-medium text-slate-800">
                            {selectedCustomer.code}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Contact Number
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-800">
                            {selectedCustomer.contactNumber || "—"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Email
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-800">
                            {selectedCustomer.email || "—"}
                          </p>
                        </div>

                        <div className="min-w-0 sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Address
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-800">
                            {selectedCustomer.address || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SERVICE NOTES */}
                <div className="space-y-2 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />

                    <label className="text-sm font-semibold text-slate-700">
                      Service Notes
                    </label>
                  </div>

                  <p className="text-xs text-slate-500">
                    Add any initial information about the customer&apos;s
                    reported issue or service request.
                  </p>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    disabled={submitting}
                    placeholder="Describe the customer's initial concern, reported issue, or other service notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <p className="text-right text-[11px] text-slate-400">
                    {notes.length}/1000
                  </p>
                </div>
              </div>
            </section>

            {/* WHAT HAPPENS NEXT */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    What happens next
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Creating this record will create the service job as{" "}
                    <span className="font-semibold">DRAFT</span>. Diagnosis,
                    repair parts, technician assignment, customer approval, and
                    repair progress will be handled from the service job detail
                    page.
                  </p>
                </div>
              </div>
            </section>

            {/* ACTIONS */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Link
                href="/service-jobs"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting || !branchId || !customerId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {submitting ? "Creating Service Job..." : "Create Service Job"}
              </button>
            </div>
          </form>
        )}
      </div>

      {showCustomerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeQuickCreateCustomer();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Add New Customer
                  </h2>

                  <p className="text-xs text-slate-500">
                    Create the customer without leaving the service job.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeQuickCreateCustomer}
                disabled={customerSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleQuickCreateCustomer}
              className="space-y-4 p-5"
            >
              {customerModalError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {customerModalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Customer Name <span className="text-rose-500">*</span>
                </label>

                <input
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. ABC Computer Shop"
                  autoFocus
                  disabled={customerSaving}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Contact Number
                  </label>

                  <input
                    value={customerForm.contactNumber}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        contactNumber: event.target.value,
                      }))
                    }
                    placeholder="09xxxxxxxxx"
                    disabled={customerSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="customer@example.com"
                    disabled={customerSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  value={customerForm.address}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional address"
                  disabled={customerSaving}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeQuickCreateCustomer}
                  disabled={customerSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={customerSaving || !customerForm.name.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customerSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
