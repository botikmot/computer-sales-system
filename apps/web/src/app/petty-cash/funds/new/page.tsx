"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  Loader2,
  Save,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { createPettyCashFund } from "@/features/petty-cash/petty-cash-api";
import { getBranches, type Branch } from "@/features/branches/branches-api";
import { getCurrentUser } from "@/lib/auth/session";

export default function NewPettyCashFundPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();

  const initialBranchId = currentUser?.branchId ?? "";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const [branchId, setBranchId] = useState(initialBranchId);
  const [name, setName] = useState("Main Branch Petty Cash");
  const [openingBalance, setOpeningBalance] = useState("10000");

  const [loadingError, setLoadingError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBranches() {
    try {
      setBranchesLoading(true);
      setLoadingError("");

      const result = await getBranches();

      const activeBranches = result.filter((branch) => branch.isActive);

      setBranches(activeBranches);

      if (!branchId) {
        const fallbackBranch =
          currentUser?.role === "ADMIN"
            ? activeBranches[0]
            : activeBranches.find(
                (branch) => branch.id === currentUser?.branchId,
              );

        if (fallbackBranch) {
          setBranchId(fallbackBranch.id);
        }
      }
    } catch (err) {
      setLoadingError(
        err instanceof Error ? err.message : "Unable to load branches.",
      );
    } finally {
      setBranchesLoading(false);
    }
  }

  // Load branches once.
  useState(() => {
    void loadBranches();
  });

  const branchOptions: SelectOption[] = branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
    description: branch.code,
  }));

  const selectedBranch =
    branches.find((branch) => branch.id === branchId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError("");

    const trimmedName = name.trim();
    const amount = Number(openingBalance);

    if (!trimmedName) {
      setSubmitError("Fund name is required.");
      return;
    }

    if (!branchId) {
      setSubmitError("Please select a branch.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError("Opening balance must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);

      const created = await createPettyCashFund({
        branchId,
        name: trimmedName,
        openingBalance: openingBalance.trim(),
      });

      router.push(`/petty-cash/${created.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to create petty cash fund.",
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
            href="/petty-cash"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Petty Cash
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Finance</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Petty Cash Fund
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Create a petty cash fund and set its opening float.
          </p>
        </div>

        {loadingError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load fund setup</p>

              <p className="mt-1">{loadingError}</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create petty cash fund</p>

              <p className="mt-1">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Banknote className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Fund Details
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Define the branch and opening amount for this petty cash
                    fund.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Fund Name <span className="text-rose-500">*</span>
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={submitting}
                  placeholder="e.g. Main Branch Petty Cash"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                />

                <p className="text-xs text-slate-400">
                  Use a clear name that identifies the petty cash fund.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Branch <span className="text-rose-500">*</span>
                </label>

                <SearchableSelect
                  value={branchId}
                  onChange={setBranchId}
                  options={branchOptions}
                  placeholder={
                    branchesLoading ? "Loading branches..." : "Search branch..."
                  }
                  searchPlaceholder="Search branch..."
                  emptyMessage="No active branches found."
                  loading={branchesLoading}
                  disabled={submitting}
                />

                {selectedBranch && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
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

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Opening Balance <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    ₱
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={openingBalance}
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    disabled={submitting}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-base font-semibold text-slate-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50"
                  />
                </div>

                <p className="text-xs text-slate-400">
                  This amount becomes both the opening balance and current fund
                  balance.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />

              <div>
                <p className="text-sm font-semibold text-violet-900">
                  Fund setup
                </p>

                <p className="mt-1 text-sm leading-6 text-violet-800">
                  Creating this fund will initialize its current balance to the
                  opening balance. Petty cash vouchers will decrease the
                  balance, while replenishments can restore it up to the opening
                  float.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Link
              href="/petty-cash"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting || branchesLoading || !branchId || !name.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {submitting ? "Creating Fund..." : "Create Petty Cash Fund"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
