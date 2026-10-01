"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { SearchableSelect } from "@/components/ui/searchable-select";

import {
  createCustomerPayment,
  getCashBankAccounts,
  getSalesInvoice,
  type CashBankAccount,
  type SalesInvoice,
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
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = typeof params.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(
    () => searchParams.get("payment") === "1",
  );

  const [paymentAmount, setPaymentAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [accountsLoading, setAccountsLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const userRole = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredUserRole,
    () => "",
  );

  const canRecordPayment =
    userRole === "ADMIN" || userRole === "MANAGER" || userRole === "CASHIER";

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesInvoice(id);

        if (!cancelled) {
          setInvoice(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales invoice.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvoice();

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
        setPaymentError("");

        const result = await getCashBankAccounts();

        if (!cancelled) {
          setAccounts(result);

          if (result.length > 0) {
            setAccountId((current) => current || result[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentError(
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

    if (!invoice) return;

    setPaymentError("");
    setPaymentSuccess("");

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    if (amount > balanceDue) {
      setPaymentError(
        `Payment cannot exceed the balance due of ${formatCurrency(balanceDue)}.`,
      );
      return;
    }

    if (!accountId) {
      setPaymentError("Select a cash/bank account.");
      return;
    }

    try {
      setPaymentSubmitting(true);

      await createCustomerPayment({
        salesInvoiceId: invoice.id,
        accountId,
        amount,
        paymentDate,
        referenceNo: referenceNo.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      setPaymentSuccess("Payment recorded successfully.");

      setPaymentAmount("");
      setReferenceNo("");
      setPaymentNotes("");

      const refreshedInvoice = await getSalesInvoice(invoice.id);
      setInvoice(refreshedInvoice);

      setShowPaymentForm(false);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Unable to record payment.",
      );
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sales invoice...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/invoices"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Invoices
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales invoice</p>

              <p className="mt-0.5">
                {error || "Sales invoice was not found."}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const balanceDue = Number(invoice.balanceDue);
  const amountPaid = Number(invoice.amountPaid);
  const isPaid = balanceDue <= 0;

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/sales/invoices"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Invoices
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {invoice.invoiceNo}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  invoice.status,
                )}`}
              >
                {invoice.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Sales invoice and customer payment details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canRecordPayment && balanceDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPaymentError("");
                  setPaymentSuccess("");
                  setShowPaymentForm((current) => !current);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <CreditCard className="h-4 w-4" />
                {showPaymentForm ? "Close Payment" : "Record Payment"}
              </button>
            )}

            {invoice.salesOrderId && (
              <Link
                href={`/sales/orders/${invoice.salesOrderId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
              >
                <ShoppingCart className="h-4 w-4" />
                View Sales Order
              </Link>
            )}
          </div>
        </section>

        {/* PAYMENT STATUS */}
        <section
          className={[
            "rounded-2xl border p-5",
            isPaid
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isPaid
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-amber-100 text-amber-600",
              ].join(" ")}
            >
              {isPaid ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${
                  isPaid ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {isPaid ? "Invoice Fully Paid" : "Payment Outstanding"}
              </p>

              <p
                className={`mt-1 text-sm ${
                  isPaid ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {isPaid
                  ? "There is no remaining balance on this invoice."
                  : `${formatCurrency(balanceDue)} remains outstanding.`}
              </p>
            </div>
          </div>
        </section>

        {canRecordPayment && balanceDue > 0 && showPaymentForm && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Record Customer Payment
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Apply a payment to {invoice.invoiceNo}. The remaining balance is{" "}
                <span className="font-mono font-semibold text-amber-600">
                  {formatCurrency(balanceDue)}
                </span>
                .
              </p>
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
                    max={balanceDue}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 font-mono text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    disabled={paymentSubmitting}
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
                  disabled={paymentSubmitting}
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
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={paymentSubmitting}
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
                  placeholder="OR / bank reference"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={paymentSubmitting}
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
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional payment notes..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={paymentSubmitting}
                />
              </div>

              {paymentError && (
                <div className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{paymentError}</p>
                </div>
              )}

              {paymentSuccess && (
                <div className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{paymentSuccess}</p>
                </div>
              )}

              <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  This will create the customer payment and corresponding
                  cash/bank transaction.
                </p>

                <button
                  type="submit"
                  disabled={
                    paymentSubmitting ||
                    accountsLoading ||
                    accounts.length === 0 ||
                    !accountId
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paymentSubmitting ? (
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

        {/* CUSTOMER + DETAILS */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Customer</h2>
            </div>

            <div className="mt-5">
              <p className="text-base font-semibold text-slate-900">
                {invoice.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {invoice.customer.code}
              </p>

              {invoice.customer.contactNumber && (
                <p className="mt-4 text-sm text-slate-600">
                  {invoice.customer.contactNumber}
                </p>
              )}

              {invoice.customer.email && (
                <p className="mt-1 text-sm text-slate-600">
                  {invoice.customer.email}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Invoice Details</h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Invoice Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Due Date
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Payment Mode
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {invoice.paymentMode}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Branch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {invoice.branch.name}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Sales Order
                </p>

                <Link
                  href={`/sales/orders/${invoice.salesOrderId}`}
                  className="mt-1 inline-flex font-mono text-sm font-semibold text-primary hover:underline"
                >
                  {invoice.salesOrder?.orderNo ?? "View Sales Order"}
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* ITEMS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Invoice Items</h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              Products billed on this sales invoice.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Qty
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Unit Price
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.product.name}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {item.product.sku}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                      {item.quantity}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>

                    <td className="px-5 py-4 text-right font-mono text-sm font-bold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* NOTES + SUMMARY */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Notes</h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {invoice.notes || "No notes were added to this invoice."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold text-slate-950">Invoice Summary</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(invoice.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax</span>

                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(invoice.tax)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="font-mono text-xl font-bold text-slate-950">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Amount Paid</span>

                  <span className="font-mono font-semibold text-emerald-600">
                    {formatCurrency(amountPaid)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Balance Due
                  </span>

                  <span
                    className={`font-mono font-bold ${
                      balanceDue > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
