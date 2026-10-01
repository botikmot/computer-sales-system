"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { createInventoryAdjustment } from "@/features/inventory/inventory-adjustment-api";
import { AppShell } from "@/components/layout/app-shell";

type StoredUser = {
  id?: string;
  username?: string;
  branchId?: string;
  branch?: {
    id?: string;
    code?: string;
    name?: string;
  };
};

function getSessionUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("compflow_user");

  if (!stored) return null;

  try {
    return JSON.parse(stored) as StoredUser;
  } catch {
    return null;
  }
}

export default function NewInventoryAdjustmentPage() {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    const user = getSessionUser();

    const branchId = user?.branchId ?? user?.branch?.id;

    if (!branchId) {
      setError(
        "No branch is assigned to your current session. Please log in again or assign a branch to this user.",
      );
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
      <div className="space-y-6">
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Adjustment Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A new adjustment starts as a DRAFT. The branch comes from your
                current login session.
              </p>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-900">
                  Physical count workflow
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  After creating this draft, you will add products and enter
                  their actual physical quantities on the adjustment detail
                  page.
                </p>
              </div>

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
                  rows={5}
                  maxLength={500}
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {notes.length}/500
                  </span>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => router.push("/adjustments")}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
