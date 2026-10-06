"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { AppShell } from "@/components/layout/app-shell";

import { createInventoryAdjustment } from "@/features/inventory/inventory-adjustment-api";

import { getBranches, type Branch } from "@/features/branches/branches-api";

type StoredUser = {
  id?: string;
  username?: string;
  role?: string;
  branchId?: string;
  branch?: {
    id?: string;
    code?: string;
    name?: string;
  };
};

function getSessionUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem("compflow_user");

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }
}

export default function NewInventoryAdjustmentPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  const [notes, setNotes] = useState("");

  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [sessionUser, setSessionUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        setLoadingBranches(true);
        setError("");

        const user = getSessionUser();

        if (cancelled) {
          return;
        }

        setSessionUser(user);

        const result = await getBranches();

        if (cancelled) {
          return;
        }

        const activeBranches = result.filter((branch) => branch.isActive);

        /*
         * Non-admin users are restricted to their assigned branch.
         * Admin users can select from the active branch list.
         */
        const isAdmin = user?.role === "ADMIN";

        const accessibleBranches = isAdmin
          ? activeBranches
          : activeBranches.filter((branch) => {
              const assignedBranchId = user?.branchId ?? user?.branch?.id;

              return assignedBranchId ? branch.id === assignedBranchId : false;
            });

        setBranches(accessibleBranches);

        /*
         * Prefer the current user's assigned branch when available.
         * Admin users without a branch start with no selection so they
         * explicitly choose the target branch.
         */
        const assignedBranchId = user?.branchId ?? user?.branch?.id;

        if (assignedBranchId) {
          const assignedBranchIsAvailable = accessibleBranches.some(
            (branch) => branch.id === assignedBranchId,
          );

          if (assignedBranchIsAvailable) {
            setBranchId(assignedBranchId);
          }
        }

        /*
         * If this is a non-admin without a branch, show a clear error.
         */
        if (!isAdmin && !assignedBranchId) {
          setError(
            "No branch is assigned to your current user. Please assign a branch before creating an inventory adjustment.",
          );
        }

        setLoadingBranches(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load branches.",
        );

        setLoadingBranches(false);
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchOptions: SelectOption[] = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
        description: `${branch.code} • Active`,
      })),
    [branches],
  );

  const isAdmin = sessionUser?.role === "ADMIN";

  const canSubmit =
    !submitting &&
    !loadingBranches &&
    !!branchId &&
    branches.some((branch) => branch.id === branchId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!branchId) {
      setError("Please select a branch.");
      return;
    }

    const selectedBranch = branches.find((branch) => branch.id === branchId);

    if (!selectedBranch) {
      setError("Selected branch is not available.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const adjustment = await createInventoryAdjustment({
        branchId,
        notes: notes.trim() || undefined,
      });

      router.push(`/adjustments/${adjustment.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create inventory adjustment.",
      );

      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Inventory</p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              New Inventory Adjustment
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create an adjustment draft before performing the physical count.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/adjustments")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {/* CARD HEADER */}
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Adjustment Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the branch where the physical count will be performed.
              </p>
            </div>

            <div className="space-y-6 p-6">
              {/* BRANCH + NOTES */}
              <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.6fr)]">
                {/* BRANCH */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Branch <span className="text-rose-500">*</span>
                  </label>

                  <SearchableSelect
                    value={branchId}
                    onChange={(value) => {
                      setBranchId(value);

                      if (value) {
                        setError("");
                      }
                    }}
                    options={branchOptions}
                    placeholder={
                      loadingBranches ? "Loading branches..." : "Select branch"
                    }
                    searchPlaceholder="Search branch..."
                    emptyMessage="No active branches available."
                    loading={loadingBranches}
                    disabled={submitting || !isAdmin}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {isAdmin
                      ? "Administrators can choose an active branch."
                      : "This adjustment uses your assigned branch."}
                  </p>
                </div>

                {/* NOTES */}
                <div>
                  <label
                    htmlFor="notes"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Example: Monthly stock count, damaged items, warehouse reconciliation..."
                    rows={4}
                    maxLength={500}
                    disabled={submitting}
                    className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <div className="mt-1 flex justify-end">
                    <span className="text-xs text-slate-400">
                      {notes.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* WORKFLOW INFO */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5">
                <p className="text-sm font-medium text-blue-900">
                  Physical count workflow
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  After creating this draft, you will add products and enter
                  their actual physical quantities on the adjustment detail
                  page.
                </p>
              </div>

              {/* ERROR */}
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/adjustments")}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Adjustment
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
