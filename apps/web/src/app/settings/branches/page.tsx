"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  createBranch,
  getBranches,
  updateBranch,
  type Branch,
} from "@/features/branches/branches-api";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type BranchForm = {
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
};

const EMPTY_FORM: BranchForm = {
  code: "",
  name: "",
  address: "",
  phone: "",
  email: "",
  isActive: true,
};

function getStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
}

export default function BranchesSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);

  async function loadBranches() {
    setLoading(true);
    setError("");

    try {
      const result = await getBranches();
      setBranches(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchBranches() {
      setLoading(true);
      setError("");

      try {
        const result = await getBranches();

        if (cancelled) {
          return;
        }

        setBranches(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load branches.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesSearch =
        !normalizedSearch ||
        branch.code.toLowerCase().includes(normalizedSearch) ||
        branch.name.toLowerCase().includes(normalizedSearch) ||
        branch.address?.toLowerCase().includes(normalizedSearch) ||
        branch.phone?.toLowerCase().includes(normalizedSearch) ||
        branch.email?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && branch.isActive) ||
        (statusFilter === "INACTIVE" && !branch.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [branches, search, statusFilter]);

  const summary = useMemo(() => {
    const total = branches.length;
    const active = branches.filter((branch) => branch.isActive).length;
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }, [branches]);

  function openCreate() {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowCreate(true);
  }

  function openEdit(branch: Branch) {
    setShowCreate(false);
    setEditingBranch(branch);

    setForm({
      code: branch.code,
      name: branch.name,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      isActive: branch.isActive,
    });

    setError("");
    setSuccess("");
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowCreate(false);
    setEditingBranch(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof BranchForm>(
    key: K,
    value: BranchForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        isActive: form.isActive,
      };

      if (!payload.code) {
        throw new Error("Branch code is required.");
      }

      if (!payload.name) {
        throw new Error("Branch name is required.");
      }

      if (editingBranch) {
        await updateBranch(editingBranch.id, payload);
        setSuccess("Branch updated successfully.");
      } else {
        await createBranch(payload);
        setSuccess("Branch created successfully.");
      }

      await loadBranches();

      setShowCreate(false);
      setEditingBranch(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save branch.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(branch: Branch) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateBranch(branch.id, {
        isActive: !branch.isActive,
      });

      await loadBranches();

      setSuccess(
        `${branch.name} is now ${branch.isActive ? "inactive" : "active"}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update branch status.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/settings"
              className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />

                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Branches
                </h1>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Manage company branches used across sales, purchasing,
                inventory, and services.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Branches"
            value={summary.total}
            icon={<Building2 className="h-4 w-4" />}
          />

          <SummaryCard
            label="Active"
            value={summary.active}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />

          <SummaryCard
            label="Inactive"
            value={summary.inactive}
            icon={<XCircle className="h-4 w-4" />}
          />
        </div>

        {/* Toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code, branch, phone, email..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="inline-flex h-10 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => {
                  const active = statusFilter === filter;

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={[
                        "rounded-md px-3 text-xs font-semibold transition",
                        active
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-400 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccess("");
                void loadBranches();
              }}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </section>

        {/* Branch Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Branch Directory
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {filteredBranches.length} branch
                  {filteredBranches.length === 1 ? "" : "es"} shown
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading branches...
              </div>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-700">
                No branches found
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Try changing your search/filter or create a new branch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Branch</TableHeader>
                    <TableHeader>Contact</TableHeader>
                    <TableHeader>Address</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader align="right">Actions</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBranches.map((branch) => (
                    <tr
                      key={branch.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 align-top">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tracking-wide text-slate-700">
                          {branch.code}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-semibold text-slate-800">
                          {branch.name}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600">
                            {branch.phone || "No phone"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {branch.email || "No email"}
                          </p>
                        </div>
                      </td>

                      <td className="max-w-xs px-5 py-4 align-top text-xs leading-5 text-slate-500">
                        {branch.address || "—"}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide",
                            getStatusClass(branch.isActive),
                          ].join(" ")}
                        >
                          {branch.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top text-xs text-slate-500">
                        {formatDate(branch.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(branch)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleToggleStatus(branch)}
                            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {branch.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredBranches.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
              <p className="text-xs text-slate-400">
                Showing {filteredBranches.length} of {branches.length} branch
                {branches.length === 1 ? "" : "es"}.
              </p>
            </div>
          )}
        </section>

        {/* Create / Edit Modal */}
        {(showCreate || editingBranch) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {editingBranch ? "Edit Branch" : "Add Branch"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {editingBranch
                      ? "Update the branch master data."
                      : "Create a new branch for the organization."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field
                    label="Branch Code"
                    required
                    value={form.code}
                    onChange={(value) => updateForm("code", value)}
                    placeholder="MAIN"
                  />

                  <Field
                    label="Branch Name"
                    required
                    value={form.name}
                    onChange={(value) => updateForm("name", value)}
                    placeholder="Main Branch"
                  />

                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => updateForm("phone", value)}
                    placeholder="0917..."
                  />

                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => updateForm("email", value)}
                    placeholder="branch@example.com"
                  />

                  <div className="sm:col-span-2">
                    <Field
                      label="Address"
                      value={form.address}
                      onChange={(value) => updateForm("address", value)}
                      placeholder="Complete branch address"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                          updateForm("isActive", event.target.checked)
                        }
                        disabled={saving}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-700">
                          Active branch
                        </span>

                        <span className="block text-xs text-slate-400">
                          Active branches can be assigned to users and used in
                          transactions.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}

                    {editingBranch ? "Save Changes" : "Create Branch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
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
