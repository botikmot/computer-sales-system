"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  getAccountsPayable,
  type AccountsPayable,
} from "@/features/purchasing/accounts-payable-api";

import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/purchasing/cash-bank-accounts-api";

import { createSupplierPayment } from "@/features/purchasing/supplier-payments-api";

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "₱0.00";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getPaymentModeLabel(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NewSupplierPaymentPage() {
  const router = useRouter();

  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<CashBankAccount[]>(
    [],
  );

  const [selectedAccountsPayableId, setSelectedAccountsPayableId] =
    useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [amount, setAmount] = useState("");

  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const [apResult, accountResult] = await Promise.all([
          getAccountsPayable({
            page: 1,
            limit: 100,
          }),
          getCashBankAccounts(),
        ]);

        if (cancelled) return;

        setAccountsPayable(apResult.items);
        setCashBankAccounts(accountResult);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load supplier payment data.",
        );
        setLoading(false);
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, []);

  const outstandingAccountsPayable = accountsPayable.filter((item) => {
    const balance = Number(item.balanceDue);

    return (
      item.status !== "CANCELLED" && Number.isFinite(balance) && balance > 0
    );
  });

  const selectedAccountsPayable =
    outstandingAccountsPayable.find(
      (item) => item.id === selectedAccountsPayableId,
    ) ?? null;

  const availableCashBankAccounts = cashBankAccounts.filter(
    (account) =>
      account.isActive &&
      (!selectedAccountsPayable ||
        account.branchId === selectedAccountsPayable.branchId),
  );

  const accountsPayableOptions: SelectOption[] = outstandingAccountsPayable.map(
    (item) => ({
      value: item.id,
      label: `${item.supplier.name} — ${formatCurrency(item.balanceDue)} due`,
      description: `${item.supplier.code} • ${item.paymentMode} • ${item.branch.code}`,
    }),
  );

  const accountOptions: SelectOption[] = availableCashBankAccounts.map(
    (account) => ({
      value: account.id,
      label: account.name,
      description: `${account.accountType}${account.accountNumber ? ` • ${account.accountNumber}` : ""}`,
    }),
  );

  function handleAccountsPayableChange(value: string) {
    setSelectedAccountsPayableId(value);

    const nextAp =
      outstandingAccountsPayable.find((item) => item.id === value) ?? null;

    if (!nextAp) {
      setAmount("");
      return;
    }

    setAmount(Number(nextAp.balanceDue).toFixed(2));

    if (!nextAp) {
      setSelectedAccountId("");
      return;
    }

    const currentAccountStillValid = availableCashBankAccounts.some(
      (account) =>
        account.id === selectedAccountId &&
        account.branchId === nextAp.branchId &&
        account.isActive,
    );

    if (!currentAccountStillValid) {
      setSelectedAccountId("");
    }
  }

  function handleAccountChange(value: string) {
    setSelectedAccountId(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError("");

    if (!selectedAccountsPayable) {
      setSubmitError("Please select an outstanding accounts payable.");
      return;
    }

    if (!selectedAccountId) {
      setSubmitError("Please select a cash or bank account.");
      return;
    }

    const numericAmount = Number(amount);
    const balanceDue = Number(selectedAccountsPayable.balanceDue);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmitError("Payment amount must be greater than zero.");
      return;
    }

    if (numericAmount > balanceDue) {
      setSubmitError(
        `Payment amount cannot exceed the outstanding balance of ${formatCurrency(
          selectedAccountsPayable.balanceDue,
        )}.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createSupplierPayment({
        accountsPayableId: selectedAccountsPayable.id,
        accountId: selectedAccountId,
        amount: numericAmount,
        paymentDate: paymentDate
          ? new Date(`${paymentDate}T00:00:00`).toISOString()
          : undefined,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      router.push(`/supplier-payments/${result.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to post supplier payment.",
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
              href="/supplier-payments"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Supplier Payments
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">Purchasing</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              New Supplier Payment
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Record a payment against an outstanding supplier liability.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to load payment data</p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to post payment</p>

                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment options...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Accounts Payable
                    </h2>

                    <p className="text-sm text-slate-500">
                      Select the outstanding supplier liability to pay.
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Accounts Payable <span className="text-red-500">*</span>
                  </span>

                  <SearchableSelect
                    value={selectedAccountsPayableId}
                    onChange={handleAccountsPayableChange}
                    options={accountsPayableOptions}
                    placeholder={
                      outstandingAccountsPayable.length > 0
                        ? "Search supplier or outstanding balance..."
                        : "No outstanding accounts payable"
                    }
                    searchPlaceholder="Search supplier..."
                    emptyMessage="No outstanding accounts payable found."
                    disabled={
                      outstandingAccountsPayable.length === 0 || submitting
                    }
                  />
                </label>

                {selectedAccountsPayable && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                        <UserRound className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {selectedAccountsPayable.supplier.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {selectedAccountsPayable.supplier.code}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Branch
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedAccountsPayable.branch.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Payment Mode
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {getPaymentModeLabel(
                            selectedAccountsPayable.paymentMode,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Original Amount
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatCurrency(
                            selectedAccountsPayable.originalAmount,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Balance Due
                        </p>

                        <p className="mt-1 text-sm font-semibold text-red-600">
                          {formatCurrency(selectedAccountsPayable.balanceDue)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Amount Paid
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatCurrency(selectedAccountsPayable.amountPaid)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Due Date
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(selectedAccountsPayable.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <WalletCards className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Payment Details
                    </h2>

                    <p className="text-sm text-slate-500">
                      Choose the cash or bank account and payment amount.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Cash / Bank Account{" "}
                      <span className="text-red-500">*</span>
                    </span>

                    <SearchableSelect
                      value={selectedAccountId}
                      onChange={handleAccountChange}
                      options={accountOptions}
                      placeholder={
                        selectedAccountsPayableId
                          ? "Search account..."
                          : "Select accounts payable first"
                      }
                      searchPlaceholder="Search cash or bank account..."
                      emptyMessage="No active account available for this branch."
                      disabled={
                        !selectedAccountsPayable ||
                        availableCashBankAccounts.length === 0 ||
                        submitting
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Payment Amount <span className="text-red-500">*</span>
                    </span>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        ₱
                      </span>

                      <input
                        type="number"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        min="0.01"
                        step="0.01"
                        max={
                          selectedAccountsPayable
                            ? Number(selectedAccountsPayable.balanceDue)
                            : undefined
                        }
                        disabled={!selectedAccountsPayable || submitting}
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>

                    {selectedAccountsPayable && (
                      <p className="mt-2 text-xs text-slate-500">
                        Maximum payment:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(selectedAccountsPayable.balanceDue)}
                        </span>
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Payment Date
                    </span>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(event) => setPaymentDate(event.target.value)}
                        disabled={submitting}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Reference No.
                    </span>

                    <input
                      value={referenceNo}
                      onChange={(event) => setReferenceNo(event.target.value)}
                      maxLength={200}
                      disabled={submitting}
                      placeholder="e.g. Check no., bank ref., OR no."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                </div>

                <label className="mt-6 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </span>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    disabled={submitting}
                    placeholder="Optional payment notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Posting this payment
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      This will immediately record the supplier payment, reduce
                      the accounts payable balance, update the related purchase
                      invoice, and record a cash/bank outflow.
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href="/supplier-payments"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loading ||
                    !selectedAccountsPayable ||
                    !selectedAccountId
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {submitting ? "Posting Payment..." : "Post Supplier Payment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
