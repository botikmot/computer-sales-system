"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  Loader2,
  Save,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import { getBranches, type Branch } from "@/features/branches/branches-api";

import {
  createCashBankAccount,
  type CreateCashBankAccountPayload,
} from "@/features/purchasing/cash-bank-accounts-api";

import { getCurrentUser } from "@/lib/auth/session";

type AccountType = "CASH" | "BANK";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function inputClassName() {
  return [
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3",
    "text-sm text-slate-900 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
    "disabled:cursor-not-allowed disabled:bg-slate-50",
  ].join(" ");
}

function textareaClassName() {
  return [
    "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3",
    "text-sm text-slate-900 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
    "disabled:cursor-not-allowed disabled:bg-slate-50",
  ].join(" ");
}

export default function NewCashBankAccountPage() {
  const router = useRouter();

  const currentUser = getCurrentUser();

  const canCreate =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [branches, setBranches] = useState<Branch[] | null>(null);

  const [branchId, setBranchId] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("BANK");
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const loadingBranches = canCreate && branches === null;

  useEffect(() => {
    if (!canCreate) {
      return;
    }

    let cancelled = false;

    async function loadBranches() {
      try {
        const result = await getBranches();

        if (cancelled) {
          return;
        }

        const activeBranches = result.filter((branch) => branch.isActive);

        setBranches(activeBranches);

        if (activeBranches.length === 1) {
          setBranchId(activeBranches[0].id);
        }

        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load branches.",
        );

        setBranches([]);
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, [canCreate]);

  const branchOptions: SelectOption[] = (branches ?? []).map((branch) => ({
    value: branch.id,
    label: `${branch.code} — ${branch.name}`,
    description: branch.address ?? "Active branch",
  }));

  const accountTypeOptions: SelectOption[] = [
    {
      value: "BANK",
      label: "Bank",
      description: "Company bank account",
    },
    {
      value: "CASH",
      label: "Cash",
      description: "Physical cash fund or cash account",
    },
  ];

  function validateForm(): string | null {
    if (!branchId) {
      return "Please select a branch.";
    }

    if (!name.trim()) {
      return "Account name is required.";
    }

    const numericOpeningBalance = Number(openingBalance);

    if (!Number.isFinite(numericOpeningBalance) || numericOpeningBalance < 0) {
      return "Opening balance must be zero or greater.";
    }

    if (accountType === "BANK" && !accountNumber.trim()) {
      return "Account number is required for bank accounts.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFieldError("");

    const validationError = validateForm();

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const numericOpeningBalance = Number(openingBalance);

    const payload: CreateCashBankAccountPayload = {
      branchId,
      accountType,
      name: name.trim(),
      accountNumber: accountNumber.trim() || undefined,
      openingBalance: numericOpeningBalance,
    };

    try {
      setSubmitting(true);

      await createCashBankAccount(payload);

      router.push("/cash-bank");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create cash or bank account.",
      );
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <AppShell>
        <div className="space-y-6 pb-8">
          <section>
            <Link
              href="/cash-bank"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cash &amp; Bank
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">Finance</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Cash / Bank Account
            </h1>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-900">
                  Access denied
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  Only Admin and Manager users can create Cash &amp; Bank
                  accounts.
                </p>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* HEADER */}
        <section>
          <Link
            href="/cash-bank"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cash &amp; Bank
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold text-primary">Finance</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Cash / Bank Account
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create a financial account that can be used for supplier payments,
              customer payments, and other cash transactions.
            </p>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to create account
                </p>

                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <WalletCards className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Account Information
                </h2>

                <p className="text-sm text-slate-500">
                  Basic information for the cash or bank account.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* BRANCH */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Branch <span className="text-red-500">*</span>
                </span>

                {loadingBranches ? (
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading branches...
                  </div>
                ) : (
                  <SearchableSelect
                    value={branchId}
                    onChange={setBranchId}
                    options={branchOptions}
                    placeholder="Select branch..."
                    searchPlaceholder="Search branch..."
                    emptyMessage="No active branch found."
                    disabled={submitting}
                  />
                )}
              </label>

              {/* ACCOUNT TYPE */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Account Type <span className="text-red-500">*</span>
                </span>

                <SearchableSelect
                  value={accountType}
                  onChange={(value) => setAccountType(value as AccountType)}
                  options={accountTypeOptions}
                  placeholder="Select account type..."
                  searchPlaceholder="Search account type..."
                  emptyMessage="No account type found."
                  disabled={submitting}
                />
              </label>

              {/* ACCOUNT NAME */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Account Name <span className="text-red-500">*</span>
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={150}
                  disabled={submitting}
                  placeholder={
                    accountType === "BANK"
                      ? "e.g. Main Operating Bank"
                      : "e.g. Main Cash Fund"
                  }
                  className={inputClassName()}
                />
              </label>

              {/* ACCOUNT NUMBER */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Account Number
                  {accountType === "BANK" && (
                    <span className="text-red-500"> *</span>
                  )}
                </span>

                <input
                  type="text"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  maxLength={100}
                  disabled={submitting}
                  placeholder={
                    accountType === "BANK"
                      ? "e.g. 1234567890"
                      : "Optional for cash accounts"
                  }
                  className={inputClassName()}
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  {accountType === "BANK"
                    ? "Enter the bank account number."
                    : "Cash accounts do not require an account number."}
                </p>
              </label>

              {/* OPENING BALANCE */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Opening Balance <span className="text-red-500">*</span>
                </span>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    ₱
                  </span>

                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    min="0"
                    step="0.01"
                    disabled={submitting}
                    className={`${inputClassName()} pl-8`}
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Initial amount available in this account.
                </p>
              </label>
            </div>

            {/* ACCOUNT PREVIEW */}
            <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-600 shadow-sm">
                  {accountType === "BANK" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Banknote className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                    Account Preview
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {name.trim() || "Account Name"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {accountType === "BANK" ? "Bank Account" : "Cash Account"}
                    {accountNumber.trim() ? ` • ${accountNumber.trim()}` : ""}
                  </p>

                  <p className="mt-2 text-sm font-bold text-cyan-700">
                    Opening Balance: {formatCurrency(openingBalance)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* NOTES */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-950">Notes</h2>

              <p className="text-sm text-slate-500">
                Optional internal notes for this setup.
              </p>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              rows={4}
              disabled={submitting}
              placeholder="Optional notes..."
              className={textareaClassName()}
            />
          </section>

          {/* VALIDATION ERROR */}
          {fieldError && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Please check the form
                  </p>

                  <p className="mt-1 text-sm text-amber-800">{fieldError}</p>
                </div>
              </div>
            </section>
          )}

          {/* ACTIONS */}
          <section className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/cash-bank"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting || loadingBranches || !branchId || !name.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Account...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Account
                </>
              )}
            </button>
          </section>
        </form>
      </div>
    </AppShell>
  );
}
