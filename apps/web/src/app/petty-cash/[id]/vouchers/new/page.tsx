"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, Loader2, Save } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  createPettyCashVoucher,
  type CreatePettyCashVoucherPayload,
} from "@/features/petty-cash/petty-cash-api";

const categoryOptions = [
  "Office Supplies",
  "Transportation",
  "Meals",
  "Communication",
  "Utilities",
  "Miscellaneous",
];

export default function NewPettyCashVoucherPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const fundId = params.id;

  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [referenceNo, setReferenceNo] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!expenseDate) {
      setError("Expense date is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    const payload: CreatePettyCashVoucherPayload = {
      expenseDate,
      description: description.trim(),
      category: category.trim(),
      amount: amount.trim(),
      payee: payee.trim() || undefined,
      referenceNo: referenceNo.trim() || undefined,
    };

    try {
      setSaving(true);

      await createPettyCashVoucher(fundId, payload);

      router.push(`/petty-cash/${fundId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create petty cash voucher.",
      );
    } finally {
      setSaving(false);
    }
  }

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
              New Expense Voucher
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record a petty cash expense as a draft voucher.
            </p>
          </div>
        </section>

        {/* FORM */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Banknote className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Expense Details
                </h2>

                <p className="text-xs text-slate-500">
                  Enter the details of the petty cash expense.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-5">
              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-800">
                    Unable to save voucher
                  </p>

                  <p className="mt-1 text-sm text-rose-700">{error}</p>
                </div>
              )}

              {/* DATE + AMOUNT */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="expenseDate"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Expense Date
                  </label>

                  <input
                    id="expenseDate"
                    type="date"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
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
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      disabled={saving}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 font-mono text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label
                  htmlFor="description"
                  className="text-sm font-semibold text-slate-800"
                >
                  Description
                </label>

                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Office supplies"
                  disabled={saving}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label
                  htmlFor="category"
                  className="text-sm font-semibold text-slate-800"
                >
                  Category
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={saving}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  <option value="">Select a category</option>

                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* PAYEE + REFERENCE */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="payee"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Payee
                  </label>

                  <input
                    id="payee"
                    type="text"
                    value={payee}
                    onChange={(event) => setPayee(event.target.value)}
                    placeholder="e.g. ABC Office Store"
                    disabled={saving}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

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
                    placeholder="e.g. OR-001"
                    disabled={saving}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
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
                disabled={saving}
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
                    Save Voucher
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* INFO */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs leading-5 text-blue-800">
            Saving creates the voucher as a <strong>DRAFT</strong>. The petty
            cash balance is not reduced until the voucher is posted.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
