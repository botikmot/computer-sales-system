"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/features/auth/auth-api";
import type { Permission } from "@/features/auth/permissions";

type PermissionDefinition = {
  key: Permission;
  label: string;
  group: string;
};

type RolePermissionEntry = {
  role: UserRole;
  permissions: Record<Permission, boolean>;
};

type PermissionMatrixResponse = {
  permissions: PermissionDefinition[];
  roles: RolePermissionEntry[];
};

const roleMetadata: Record<UserRole, { name: string; summary: string }> = {
  ADMIN: {
    name: "Administrator",
    summary: "Full system access and user administration.",
  },
  MANAGER: {
    name: "Manager",
    summary: "Operational management and authorized approvals.",
  },
  SALES: {
    name: "Sales",
    summary: "Sales workflows and related operations.",
  },
  PURCHASING: {
    name: "Purchasing",
    summary: "Supplier and purchasing workflows.",
  },
  INVENTORY: {
    name: "Inventory",
    summary: "Products, stock, receiving, and assembly.",
  },
  TECHNICIAN: {
    name: "Technician",
    summary: "Service and repair workflows.",
  },
  CASHIER: {
    name: "Cashier",
    summary: "Authorized payment and cash operations.",
  },
};

const roleOrder: UserRole[] = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "PURCHASING",
  "INVENTORY",
  "TECHNICIAN",
  "CASHIER",
];

export default function RolesPermissionsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [matrix, setMatrix] = useState<PermissionMatrixResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("SALES");
  const [draft, setDraft] = useState<Record<Permission, boolean> | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPermissions() {
      const user = getCurrentUser();

      if (!active) return;

      const admin = user?.role === "ADMIN";
      setIsAdmin(admin);

      if (!admin) {
        setError("Only administrators can manage role permissions.");
        setLoading(false);
        return;
      }

      try {
        const response =
          await apiFetch<PermissionMatrixResponse>("/permissions/roles");

        if (!active) return;

        setMatrix(response);

        const initialRole =
          response.roles.find((item) => item.role === "SALES") ??
          response.roles[0];

        if (initialRole) {
          setSelectedRole(initialRole.role);
          setDraft({ ...initialRole.permissions });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load permissions.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPermissions();

    return () => {
      active = false;
    };
  }, []);

  const selectedEntry = matrix?.roles.find(
    (item) => item.role === selectedRole,
  );

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();

    for (const permission of matrix?.permissions ?? []) {
      const current = groups.get(permission.group) ?? [];
      current.push(permission);
      groups.set(permission.group, current);
    }

    return Array.from(groups.entries());
  }, [matrix]);

  const hasChanges = Boolean(
    draft &&
    selectedEntry &&
    matrix?.permissions.some(
      ({ key }) => draft[key] !== selectedEntry.permissions[key],
    ),
  );

  function selectRole(role: UserRole) {
    const entry = matrix?.roles.find((item) => item.role === role);

    if (!entry) return;

    setSelectedRole(role);
    setDraft({ ...entry.permissions });
    setError(null);
    setSuccess(null);
  }

  function togglePermission(permission: Permission, checked: boolean) {
    setDraft((current) =>
      current ? { ...current, [permission]: checked } : current,
    );
    setError(null);
    setSuccess(null);
  }

  async function savePermissions() {
    if (!matrix || !draft || !hasChanges || selectedRole === "ADMIN") {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetch<PermissionMatrixResponse>(
        `/permissions/roles/${selectedRole}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            permissions: matrix.permissions.map(({ key }) => ({
              permissionKey: key,
              isAllowed: Boolean(draft[key]),
            })),
          }),
        },
      );

      setMatrix(response);

      const updatedRole = response.roles.find(
        (item) => item.role === selectedRole,
      );

      if (updatedRole) {
        setDraft({ ...updatedRole.permissions });
      }

      setSuccess(`Permissions for ${selectedRole} saved successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save permissions.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading role permissions...
        </div>
      </AppShell>
    );
  }

  if (isAdmin !== true) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Only an administrator can manage role permissions.
          </p>
          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </div>
      </AppShell>
    );
  }

  const selectedRoleName = roleMetadata[selectedRole].name;

  const allowedCount =
    matrix?.permissions.filter(({ key }) => draft?.[key]).length ?? 0;

  return (
    <AppShell>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>

            <p className="mt-4 text-sm font-semibold text-violet-700">
              Security
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Roles &amp; Permissions
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Manage module access for each role. Changes are saved to the
              database.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <LockKeyhole className="h-6 w-6" />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Select a Role
              </h2>
              <p className="text-xs text-slate-500">
                Choose a role to review or change its module access.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roleOrder.map((role) => {
              const active = role === selectedRole;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {roleMetadata[role].name}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-wide text-slate-600">
                      {role}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {roleMetadata[role].summary}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {selectedRoleName} Permissions
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {allowedCount} of {matrix?.permissions.length ?? 0} modules
                  enabled
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={savePermissions}
              disabled={
                saving || loading || selectedRole === "ADMIN" || !hasChanges
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {selectedRole === "ADMIN" && (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:px-6">
              Administrator permissions are locked to prevent accidental
              lockout.
            </div>
          )}

          <div className="space-y-6 p-5 sm:p-6">
            {groupedPermissions.map(([group, permissions]) => (
              <div key={group}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {group}
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {permissions.map((permission) => {
                    const checked = Boolean(draft?.[permission.key]);

                    return (
                      <label
                        key={permission.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                          selectedRole === "ADMIN"
                            ? "cursor-not-allowed border-slate-100 bg-slate-50"
                            : checked
                              ? "border-violet-200 bg-violet-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={selectedRole === "ADMIN" || saving}
                          onChange={(event) =>
                            togglePermission(
                              permission.key,
                              event.target.checked,
                            )
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900">
                            {permission.label}
                          </span>
                          <span className="mt-1 block break-all text-xs text-slate-500">
                            {permission.key}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              These settings save module-level permission preferences. Existing
              backend routes still use their current role restrictions unless
              they are explicitly migrated to database permission checks.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
