"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createCustomerPayment,
  getCashBankAccounts,
  getCustomerPayment,
  type CashBankAccount,
  type CustomerPayment,
} from "@/features/sales/sales-api";

function getStoredUserRole() {
  if (typeof window === "undefined") return "";

  try {
    const rawUser = window.localStorage.getItem("compflow_user");

    if (!rawUser) return "";

    const parsed = JSON.parse(rawUser);

    if (typeof parsed?.role === "string") {
      return parsed.role;
    }

    if (typeof parsed?.user?.role === "string") {
      return parsed.user.role;
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

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "VOID":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function CustomerPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = typeof params.id === "string" ? params.id : "";

  const [payment, setPayment] = useState<CustomerPayment | null>(null);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const userRole = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredUserRole,
    () => "",
  );

  const canRecordPayment =
    userRole === "ADMIN" || userRole === "MANAGER" || userRole === "CASHIER";

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadPayment() {
      try {
        setLoading(true);
        setError("");

        const result = await getCustomerPayment(id);

        if (!cancelled) {
          setPayment(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load customer payment.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!canRecordPayment) return;

    let cancelled = false;

    async function loadAccounts() {
      try {
        setAccountsLoading(true);
        setFormError("");

        const result = await getCashBankAccounts();

        if (!cancelled) {
          setAccounts(result);

          if (result.length > 0) {
            setAccountId((current) => current || result[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setFormError(
            err instanceof Error
              ? err.message
              : "Unable to load cash/bank accounts.",
          );
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [canRecordPayment]);

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!payment) return;

    setFormError("");
    setSuccessMessage("");

    const relatedInvoice = payment.salesInvoice ?? payment.serviceInvoice;

    if (!relatedInvoice) {
      setFormError("This payment has no related invoice.");
      return;
    }

    const parsedAmount = Number(amount);
    const balanceDue = Number(relatedInvoice.balanceDue);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter a valid payment amount.");
      return;
    }

    if (parsedAmount > balanceDue) {
      setFormError(
        `Payment cannot exceed the remaining balance of ${formatCurrency(
          balanceDue,
        )}.`,
      );
      return;
    }

    if (!accountId) {
      setFormError("Select a cash/bank account.");
      return;
    }

    try {
      setSubmitting(true);

      await createCustomerPayment({
        ...(payment.salesInvoice
          ? { salesInvoiceId: payment.salesInvoice.id }
          : { serviceInvoiceId: payment.serviceInvoice!.id }),
        accountId,
        amount: parsedAmount,
        paymentDate,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage("Payment recorded successfully.");

      setAmount("");
      setReferenceNo("");
      setNotes("");

      const refreshedPayment = await getCustomerPayment(id);
      setPayment(refreshedPayment);

      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to record payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading customer payment...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!payment) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/payments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer Payments
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load customer payment</p>

              <p className="mt-0.5">
                {error || "Customer payment was not found."}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const invoice = payment.salesInvoice ?? payment.serviceInvoice;
  const isSalesInvoice = Boolean(payment.salesInvoice);

  const invoiceBalanceDue = invoice ? Number(invoice.balanceDue) : 0;
  const hasBalanceDue = invoiceBalanceDue > 0;

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/sales/payments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customer Payments
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {payment.paymentNo}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  payment.status,
                )}`}
              >
                {payment.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Customer collection and cash/bank transaction details.
            </p>
          </div>
        </section>

        {/* SUCCESS */}
        {payment.status === "POSTED" && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Payment Posted
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  This customer payment has been recorded successfully.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CUSTOMER + PAYMENT */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-slate-950">Payment Details</h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Payment Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(payment.paymentDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Amount
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-slate-950">
                  {formatCurrency(payment.amount)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Reference No.
                </p>

                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {payment.referenceNo || "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Branch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {payment.branch.name}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Customer & Account
              </h2>
            </div>

            <div className="mt-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Customer
                </p>

                <p className="mt-1 text-base font-semibold text-slate-900">
                  {payment.customer.name}
                </p>

                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {payment.customer.code}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Cash / Bank Account
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {payment.account.name}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {payment.account.accountType}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* INVOICE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">Related Invoice</h2>
          </div>

          {invoice ? (
            <div className="mt-5 flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {invoice.invoiceNo}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {isSalesInvoice ? "Sales Invoice" : "Service Invoice"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Remaining Balance
                  </p>

                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      hasBalanceDue ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(invoiceBalanceDue)}
                  </p>
                </div>

                {payment.salesInvoice ? (
                  <Link
                    href={`/sales/invoices/${payment.salesInvoice.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                  >
                    <Receipt className="h-4 w-4" />
                    View Sales Invoice
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">
                    Service invoice linked
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No invoice is linked to this payment.
            </p>
          )}
        </section>

        {/* RECORD PAYMENT */}
        {canRecordPayment && invoice && hasBalanceDue && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Record Another Payment
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Apply another customer payment to this invoice.
                </p>
              </div>

              <div className="hidden rounded-xl bg-white px-4 py-3 text-right shadow-sm sm:block">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Balance Due
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-amber-600">
                  {formatCurrency(invoiceBalanceDue)}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleRecordPayment}
              className="mt-6 grid gap-5 lg:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="payment-amount"
                  className="text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Amount
                </label>

                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">
                    ₱
                  </span>

                  <input
                    id="payment-amount"
                    type="number"
                    min="0.01"
                    max={invoiceBalanceDue}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-mono outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-account"
                  className="text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Cash / Bank Account
                </label>

                <SearchableSelect
                  value={accountId}
                  onChange={setAccountId}
                  options={accounts.map((account) => ({
                    value: account.id,
                    label: `${account.name} — ${account.accountType}`,
                    description: account.accountNumber
                      ? account.accountNumber
                      : "No account number",
                  }))}
                  placeholder="Select cash / bank account"
                  searchPlaceholder="Search account..."
                  emptyMessage="No cash/bank accounts found."
                  disabled={submitting || accountsLoading}
                  loading={accountsLoading}
                  className="mt-2"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-date"
                  className="text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Payment Date
                </label>

                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="payment-reference"
                  className="text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Reference No.
                </label>

                <input
                  id="payment-reference"
                  type="text"
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  placeholder="Official receipt, bank reference, etc."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                />
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="payment-notes"
                  className="text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Notes
                </label>

                <textarea
                  id="payment-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional payment notes..."
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                />
              </div>

              {formError && (
                <div className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>{formError}</p>
                </div>
              )}

              {successMessage && (
                <div className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                  <p>{successMessage}</p>
                </div>
              )}

              <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  The payment will also create the corresponding cash/bank
                  transaction.
                </p>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    accountsLoading ||
                    accounts.length === 0 ||
                    !accountId
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* NO BALANCE */}
        {canRecordPayment && invoice && !hasBalanceDue && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Invoice Fully Paid
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  There is no remaining balance to collect on this invoice.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CASH / BANK TRANSACTION */}
        {payment.cashBankTransaction && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Cash / Bank Transaction
              </h2>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Transaction Type
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {payment.cashBankTransaction.transactionType}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Direction
                </p>

                <p className="mt-1 text-sm font-semibold text-emerald-600">
                  {payment.cashBankTransaction.direction}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Transaction Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(payment.cashBankTransaction.transactionDate)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* NOTES */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <h2 className="font-semibold text-slate-950">Notes</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {payment.notes || "No notes were added to this payment."}
          </p>
        </section>
      </div>
    </AppShell>
  );
}
