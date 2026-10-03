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
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import {
  getCustomers,
  type Customer,
} from "@/features/customers/customers-api";

import { createServiceJob } from "@/features/service-repair/service-jobs-api";

function getCustomerDisplayName(customer: Customer) {
  return customer.name?.trim() || customer.code;
}

export default function NewServiceJobPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const [branchResult, customerResult] = await Promise.all([
          getBranches(),
          getCustomers(),
        ]);

        if (cancelled) return;

        setBranches(branchResult);
        setCustomers(customerResult);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load service job options.",
        );
        setLoading(false);
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
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="">
        <div className="">
          <div className="mb-6">
            <Link
              href="/service-jobs"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Service Jobs
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-primary">Services</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Service Job
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Create a repair job for an active customer and branch.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to create service job</p>

                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading service job options...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Service Location
                    </h2>

                    <p className="text-sm text-slate-500">
                      Select the branch where the repair will be handled.
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Branch <span className="text-red-500">*</span>
                  </span>

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
                </label>

                {selectedBranch && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                        <Building2 className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedBranch.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Branch Code: {selectedBranch.code}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Customer
                    </h2>

                    <p className="text-sm text-slate-500">
                      Select the customer requesting the repair.
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Customer <span className="text-red-500">*</span>
                  </span>

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
                  />
                </label>

                {selectedCustomer && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Customer
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {getCustomerDisplayName(selectedCustomer)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Customer Code
                        </p>

                        <p className="mt-1 font-mono text-sm font-medium text-slate-800">
                          {selectedCustomer.code}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Contact Number
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {selectedCustomer.contactNumber || "—"}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Email
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {selectedCustomer.email || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Address
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {selectedCustomer.address || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Service Notes
                    </h2>

                    <p className="text-sm text-slate-500">
                      Add any initial information about the repair.
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </span>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={1000}
                    rows={5}
                    disabled={submitting}
                    placeholder="Describe the customer's initial concern, reported issue, or other service notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <p className="mt-2 text-right text-xs text-slate-400">
                    {notes.length}/1000
                  </p>
                </label>
              </section>

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
                      repair parts, technician assignment, customer approval,
                      and repair progress will be handled from the service job
                      detail page.
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
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

                  {submitting
                    ? "Creating Service Job..."
                    : "Create Service Job"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
