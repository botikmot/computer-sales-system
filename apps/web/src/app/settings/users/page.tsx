"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
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
  createUser,
  getUsers,
  updateUserBranch,
  updateUserRole,
  updateUserStatus,
  type User,
  type UserRole,
  type UserStatus,
} from "@/features/users/users-api";

import { getBranches, type Branch } from "@/features/branches/branches-api";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | UserStatus;

const roleOptions: SelectOption[] = [
  {
    value: "ADMIN",
    label: "Administrator",
    description: "Full system access",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Management and operational access",
  },
  {
    value: "SALES",
    label: "Sales",
    description: "Sales operations",
  },
  {
    value: "PURCHASING",
    label: "Purchasing",
    description: "Purchasing operations",
  },
  {
    value: "INVENTORY",
    label: "Inventory",
    description: "Inventory operations",
  },
  {
    value: "TECHNICIAN",
    label: "Technician",
    description: "Service and repair operations",
  },
  {
    value: "CASHIER",
    label: "Cashier",
    description: "Payments and cashier operations",
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

const roleFilterOptions: SelectOption[] = [
  {
    value: "ALL",
    label: "All roles",
  },
  ...roleOptions,
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

function roleLabel(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "MANAGER":
      return "Manager";
    case "SALES":
      return "Sales";
    case "PURCHASING":
      return "Purchasing";
    case "INVENTORY":
      return "Inventory";
    case "TECHNICIAN":
      return "Technician";
    case "CASHIER":
      return "Cashier";
    default:
      return role;
  }
}

function statusClass(status: UserStatus) {
  return status === "ACTIVE"
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

function getCurrentUserIdSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawUser = window.localStorage.getItem("compflow_user");

    if (!rawUser) {
      return "";
    }

    const parsed = JSON.parse(rawUser);

    if (typeof parsed?.id === "string") {
      return parsed.id;
    }

    if (typeof parsed?.user?.id === "string") {
      return parsed.user.id;
    }

    return "";
  } catch {
    return "";
  }
}

function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("compflow-auth-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("compflow-auth-change", callback);
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [branchFilter, setBranchFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createUsername, setCreateUsername] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("SALES");
  const [createBranchId, setCreateBranchId] = useState("");

  const [manageRole, setManageRole] = useState<UserRole>("SALES");
  const [manageBranchId, setManageBranchId] = useState("");

  const currentUserId = useSyncExternalStore(
    subscribeToAuthChanges,
    getCurrentUserIdSnapshot,
    () => "",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        const result = await getBranches();

        if (cancelled) {
          return;
        }

        setBranches(result);
        setBranchesLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setBranches([]);
        setBranchesLoading(false);
        setError(
          err instanceof Error ? err.message : "Unable to load branches.",
        );
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);

        const result = await getUsers({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          role: roleFilter === "ALL" ? undefined : (roleFilter as UserRole),
          status: statusFilter === "ALL" ? undefined : statusFilter,
          branchId: branchFilter || undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (cancelled) {
          return;
        }

        setUsers(result.items);
        setPages(Math.max(result.pagination.pages, 1));
        setTotal(result.pagination.total);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setUsers([]);
        setError(err instanceof Error ? err.message : "Unable to load users.");
        setLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page, search, roleFilter, statusFilter, branchFilter]);

  function resetCreateForm() {
    setCreateUsername("");
    setCreateFullName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("SALES");
    setCreateBranchId("");
  }

  function closeCreateModal() {
    if (submitting) {
      return;
    }

    setShowCreateModal(false);
    resetCreateForm();
  }

  function openManageModal(user: User) {
    setSelectedUser(user);
    setManageRole(user.role);
    setManageBranchId(user.branchId ?? "");
    setError("");
    setSuccess("");
    setShowManageModal(true);
  }

  function closeManageModal() {
    if (submitting) {
      return;
    }

    setShowManageModal(false);
    setSelectedUser(null);
  }

  function branchOptions(): SelectOption[] {
    return branches.map((branch) => ({
      value: branch.id,
      label: `${branch.code} — ${branch.name}`,
      description: branch.isActive ? "Active branch" : "Inactive branch",
      disabled: !branch.isActive,
    }));
  }

  async function refreshUsers() {
    try {
      setLoading(true);

      const result = await getUsers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter === "ALL" ? undefined : (roleFilter as UserRole),
        status: statusFilter === "ALL" ? undefined : statusFilter,
        branchId: branchFilter || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      setUsers(result.items);
      setPages(Math.max(result.pagination.pages, 1));
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (createRole !== "ADMIN" && !createBranchId) {
      setError("Non-admin users must be assigned to a branch.");
      return;
    }

    try {
      setSubmitting(true);

      await createUser({
        username: createUsername.trim(),
        fullName: createFullName.trim(),
        email: createEmail.trim() || undefined,
        password: createPassword,
        role: createRole,
        branchId: createBranchId || null,
      });

      closeCreateModal();

      setSuccess("User created successfully.");

      setPage(1);

      const result = await getUsers({
        page: 1,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter === "ALL" ? undefined : (roleFilter as UserRole),
        status: statusFilter === "ALL" ? undefined : statusFilter,
        branchId: branchFilter || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      setUsers(result.items);
      setPages(Math.max(result.pagination.pages, 1));
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManageUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setError("");
    setSuccess("");

    if (manageRole !== "ADMIN" && !manageBranchId) {
      setError("Non-admin users must be assigned to a branch.");
      return;
    }

    try {
      setSubmitting(true);

      const currentRole = selectedUser.role;
      const currentBranchId = selectedUser.branchId ?? null;
      const nextBranchId =
        manageRole === "ADMIN" ? manageBranchId || null : manageBranchId;

      if (
        manageRole !== "ADMIN" &&
        nextBranchId &&
        nextBranchId !== currentBranchId
      ) {
        await updateUserBranch(selectedUser.id, {
          branchId: nextBranchId,
        });
      }

      if (manageRole !== currentRole) {
        await updateUserRole(selectedUser.id, {
          role: manageRole,
        });
      }

      if (manageRole === "ADMIN" && nextBranchId !== currentBranchId) {
        await updateUserBranch(selectedUser.id, {
          branchId: nextBranchId,
        });
      }

      closeManageModal();

      setSuccess("User settings updated successfully.");

      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(user: User) {
    setError("");
    setSuccess("");

    const nextStatus: UserStatus =
      user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setSubmitting(true);

      await updateUserStatus(user.id, {
        status: nextStatus,
      });

      setSuccess(
        nextStatus === "ACTIVE"
          ? `${user.fullName} is now active.`
          : `${user.fullName} has been deactivated.`,
      );

      await refreshUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update user status.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleRoleFilter(value: string) {
    setPage(1);
    setRoleFilter(value);
  }

  function handleStatusFilter(value: string) {
    setPage(1);
    setStatusFilter(value as StatusFilter);
  }

  function handleBranchFilter(value: string) {
    setPage(1);
    setBranchFilter(value);
  }

  const branchFilterOptions: SelectOption[] = [
    {
      value: "",
      label: "All branches",
    },
    ...branchOptions(),
  ];

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Settings</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Users
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage system users, roles, branches, and account status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowCreateModal(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add User
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total Users
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <UserRound className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {loading ? "—" : total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Active
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {loading ? "—" : "—"}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Use the status filter for the active count.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Page
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {page}
              <span className="ml-1 text-base font-medium text-slate-400">
                / {pages}
              </span>
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <form
                onSubmit={handleSearchSubmit}
                className="flex min-w-0 flex-1 gap-2"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search name, username, or email..."
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

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[670px]">
                <SearchableSelect
                  value={roleFilter}
                  onChange={handleRoleFilter}
                  options={roleFilterOptions}
                  placeholder="All roles"
                  searchPlaceholder="Search role..."
                  emptyMessage="No role found."
                />

                <SearchableSelect
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  options={statusOptions}
                  placeholder="All statuses"
                  searchPlaceholder="Search status..."
                  emptyMessage="No status found."
                />

                <SearchableSelect
                  value={branchFilter}
                  onChange={handleBranchFilter}
                  options={branchFilterOptions}
                  placeholder="All branches"
                  searchPlaceholder="Search branch..."
                  emptyMessage="No branch found."
                  loading={branchesLoading}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    User
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Role
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Branch
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
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />

                        <p className="text-sm">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <UserRound className="h-7 w-7" />

                        <p className="text-sm font-medium text-slate-600">
                          No users found.
                        </p>

                        <p className="text-xs text-slate-400">
                          Try changing your filters or add a new user.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {user.fullName}
                            </p>

                            {currentUserId === user.id && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                                You
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-xs text-slate-500">
                            @{user.username}
                          </p>

                          {user.email && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {roleLabel(user.role)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {user.branch ? (
                          <div>
                            <p className="font-medium text-slate-800">
                              {user.branch.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              {user.branch.code}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">No branch</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusClass(user.status),
                          ].join(" ")}
                        >
                          {user.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openManageModal(user)}
                            disabled={submitting || user.id === currentUserId}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Manage
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(user)}
                            disabled={submitting || user.id === currentUserId}
                            className={[
                              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                              user.status === "ACTIVE"
                                ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300",
                              "disabled:cursor-not-allowed disabled:opacity-40",
                            ].join(" ")}
                          >
                            {user.status === "ACTIVE" ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}

                            {user.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Add User</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a user and assign their role and branch.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5 px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Username <span className="text-red-500">*</span>
                  </span>

                  <input
                    value={createUsername}
                    onChange={(event) => setCreateUsername(event.target.value)}
                    className={inputClassName()}
                    placeholder="e.g. juan"
                    minLength={3}
                    required
                    disabled={submitting}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </span>

                  <input
                    value={createFullName}
                    onChange={(event) => setCreateFullName(event.target.value)}
                    className={inputClassName()}
                    placeholder="e.g. Juan Dela Cruz"
                    minLength={2}
                    required
                    disabled={submitting}
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </span>

                  <input
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    className={inputClassName()}
                    placeholder="user@example.com"
                    disabled={submitting}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </span>

                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    className={inputClassName()}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    disabled={submitting}
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Role <span className="text-red-500">*</span>
                  </span>

                  <SearchableSelect
                    value={createRole}
                    onChange={(value) => setCreateRole(value as UserRole)}
                    options={roleOptions}
                    placeholder="Select role"
                    searchPlaceholder="Search role..."
                    emptyMessage="No role found."
                    disabled={submitting}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Branch
                    {createRole !== "ADMIN" && (
                      <span className="text-red-500"> *</span>
                    )}
                  </span>

                  <SearchableSelect
                    value={createBranchId}
                    onChange={setCreateBranchId}
                    options={branchOptions()}
                    placeholder={
                      branchesLoading ? "Loading branches..." : "Select branch"
                    }
                    searchPlaceholder="Search branch..."
                    emptyMessage="No active branch found."
                    loading={branchesLoading}
                    disabled={submitting}
                  />

                  {createRole === "ADMIN" && (
                    <p className="mt-2 text-xs text-slate-400">
                      Administrators may be assigned without a branch.
                    </p>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeCreateModal}
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

                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Manage User
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedUser.fullName} · @{selectedUser.username}
                </p>
              </div>

              <button
                type="button"
                onClick={closeManageModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManageUser} className="space-y-5 px-6 py-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Current Assignment
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">
                    {roleLabel(selectedUser.role)}
                  </span>

                  <span className="text-slate-400">·</span>

                  <span className="text-slate-600">
                    {selectedUser.branch?.name ?? "No branch"}
                  </span>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Role <span className="text-red-500">*</span>
                </span>

                <SearchableSelect
                  value={manageRole}
                  onChange={(value) => setManageRole(value as UserRole)}
                  options={roleOptions}
                  placeholder="Select role"
                  searchPlaceholder="Search role..."
                  emptyMessage="No role found."
                  disabled={submitting}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Branch
                  {manageRole !== "ADMIN" && (
                    <span className="text-red-500"> *</span>
                  )}
                </span>

                <SearchableSelect
                  value={manageBranchId}
                  onChange={setManageBranchId}
                  options={branchOptions()}
                  placeholder="Select branch"
                  searchPlaceholder="Search branch..."
                  emptyMessage="No active branch found."
                  loading={branchesLoading}
                  disabled={submitting}
                />

                {manageRole === "ADMIN" && (
                  <p className="mt-2 text-xs text-slate-400">
                    Administrators may remain without a branch.
                  </p>
                )}
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeManageModal}
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

                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
