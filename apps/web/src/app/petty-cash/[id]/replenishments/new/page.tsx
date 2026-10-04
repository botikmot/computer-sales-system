"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleDollarSign,
  Loader2,
  Save,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";

import {
  createPettyCashReplenishment,
  getPettyCashFund,
  type CreatePettyCashReplenishmentPayload,
  type PettyCashFund,
} from "@/features/petty-cash/petty-cash-api";

import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatAccountType(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NewPettyCashReplenishmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const fundId = params.id;

  const [fund, setFund] = useState<PettyCashFund | null>(null);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [replenishmentDate, setReplenishmentDate] = useState(() => getToday());

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReplenishmentData() {
      try {
        if (!cancelled) {
          setLoading(true);
          setError("");
        }

        const [fundResult, accountsResult] = await Promise.all([
          getPettyCashFund(fundId),
          getCashBankAccounts(),
        ]);

        if (cancelled) {
          return;
        }

        setFund(fundResult);

        setAccounts(accountsResult.filter((account) => account.isActive));
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load replenishment data.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReplenishmentData();

    return () => {
      cancelled = true;
    };
  }, [fundId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!fund) {
      setError("Petty cash fund could not be loaded.");
      return;
    }

    if (fund.status !== "ACTIVE") {
      setError("Petty cash fund is inactive.");
      return;
    }

    if (!accountId) {
      setError("Cash/Bank account is required.");
      return;
    }

    if (!replenishmentDate) {
      setError("Replenishment date is required.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    const shortfall = Math.max(
      0,
      Number(fund.openingBalance) - Number(fund.currentBalance),
    );

    if (numericAmount > shortfall) {
      setError(`Maximum replenishment is ${formatCurrency(shortfall)}.`);
      return;
    }

    const selectedAccount = accounts.find(
      (account) => account.id === accountId,
    );

    if (!selectedAccount) {
      setError("Selected Cash/Bank account was not found.");
      return;
    }

    if (selectedAccount.branchId !== fund.branchId) {
      setError(
        "Selected Cash/Bank account does not belong to this fund's branch.",
      );
      return;
    }

    const payload: CreatePettyCashReplenishmentPayload = {
      accountId,
      replenishmentDate,
      amount: amount.trim(),
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setSaving(true);

      await createPettyCashReplenishment(fundId, payload);

      router.push(`/petty-cash/${fundId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create petty cash replenishment.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading replenishment data...
          </div>
        </div>
      </AppShell>
    );
  }

  const openingBalance = Number(fund?.openingBalance || 0);

  const currentBalance = Number(fund?.currentBalance || 0);

  const shortfall = Math.max(0, openingBalance - currentBalance);

  const accountOptions = accounts
    .filter((account) => !fund || account.branchId === fund.branchId)
    .map((account) => ({
      value: account.id,
      label: account.name,
      description: `${formatAccountType(
        account.accountType,
      )}${account.accountNumber ? ` • ${account.accountNumber}` : ""}`,
    }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        {/* HEADER */}
        <section>
          <Link
            href={`/petty-cash/${fundId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fund
          </Link>

          <div className="mt-4">
            <p className="text-sm font-semibold text-primary">
              Finance / Petty Cash
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Replenish Petty Cash
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record funds to be added back to the petty cash fund.
            </p>
          </div>
        </section>

        {/* FUND SUMMARY */}
        {fund && (
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Opening Float
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {formatCurrency(fund.openingBalance)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Current Balance
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatCurrency(fund.currentBalance)}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                Maximum Replenishment
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-700">
                {formatCurrency(shortfall)}
              </p>
            </div>
          </section>
        )}

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">
              Unable to save replenishment
            </p>

            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </section>
        )}

        {/* FORM */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Replenishment Details
                </h2>

                <p className="text-xs text-slate-500">
                  Select the Cash/Bank account and enter the amount to
                  replenish.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-5">
              {/* DATE + AMOUNT */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="replenishmentDate"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Replenishment Date
                  </label>

                  <input
                    id="replenishmentDate"
                    type="date"
                    value={replenishmentDate}
                    onChange={(event) =>
                      setReplenishmentDate(event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Amount
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      ₱
                    </span>

                    <input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      max={shortfall > 0 ? shortfall : undefined}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      disabled={saving || shortfall <= 0}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 font-mono text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Maximum: {formatCurrency(shortfall)}
                  </p>
                </div>
              </div>

              {/* ACCOUNT */}
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Cash / Bank Account
                </label>

                <div className="mt-2">
                  <SearchableSelect
                    value={accountId}
                    onChange={setAccountId}
                    options={accountOptions}
                    placeholder="Select Cash/Bank account"
                    searchPlaceholder="Search account..."
                    emptyMessage="No active account found for this branch."
                    disabled={saving}
                  />
                </div>
              </div>

              {/* REFERENCE + NOTES */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="referenceNo"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Reference No.
                  </label>

                  <input
                    id="referenceNo"
                    type="text"
                    value={referenceNo}
                    onChange={(event) => setReferenceNo(event.target.value)}
                    placeholder="e.g. BANK-DEP-001"
                    disabled={saving}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Notes
                  </label>

                  <input
                    id="notes"
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes"
                    disabled={saving}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* ACCOUNTING PREVIEW */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Posting effect
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Posting this replenishment will increase the petty cash
                      fund and record the corresponding amount as an OUT
                      transaction from the selected Cash/Bank account.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={`/petty-cash/${fundId}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  saving || !fund || fund.status !== "ACTIVE" || shortfall <= 0
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Replenishment
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* INFO */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs leading-5 text-blue-800">
            Saving creates the replenishment as a <strong>DRAFT</strong>. The
            petty cash balance and Cash/Bank ledger are updated only when the
            replenishment is posted.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
