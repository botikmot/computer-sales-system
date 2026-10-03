"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  ReceiptText,
  UserRound,
  WalletCards,
  Banknote,
  Save,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getCurrentUser } from "@/lib/auth/session";

import {
  getServiceInvoice,
  type ServiceInvoice,
} from "@/features/service-repair/service-invoices-api";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  getCashBankAccounts,
  type CashBankAccount,
} from "@/features/cash-bank/cash-bank-accounts-api";

import { createCustomerPayment } from "@/features/sales/customer-payments-api";

function formatCurrency(value: string | number | null | undefined) {
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

function formatDateTime(value?: string | null) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPaymentMode(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatItemType(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value.charAt(0) + value.slice(1).toLowerCase();
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function ServiceInvoiceDetailPage() {
  const params = useParams<{ id: string }>();

  const [invoice, setInvoice] = useState<ServiceInvoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = getCurrentUser();

  const canRecordPayment =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "MANAGER" ||
    currentUser?.role === "CASHIER";

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const invoiceId = params.id;

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    let cancelled = false;

    async function loadInvoice() {
      try {
        const result = await getServiceInvoice(invoiceId);

        if (cancelled) {
          return;
        }

        setInvoice(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load service invoice.",
        );
        setLoading(false);
      }
    }

    void loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <AppShell>
        <div className="px-6 py-8">
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading service invoice...
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell>
        <div className="px-6 py-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load service invoice
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {error || "Service invoice was not found."}
                </p>

                <Link
                  href="/service-invoices"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Service Invoices
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalItems = invoice.items.length;

  const laborItems = invoice.items.filter((item) => item.itemType === "LABOR");

  const partItems = invoice.items.filter((item) => item.itemType === "PART");

  const hasOutstandingBalance = Number(invoice.balanceDue) > 0;

  async function openPaymentForm() {
    if (!invoice) return;

    try {
      setAccountsLoading(true);
      setError("");

      const result = await getCashBankAccounts();

      const availableAccounts = result.filter(
        (account) => account.isActive && account.branchId === invoice.branchId,
      );

      setAccounts(availableAccounts);

      setSelectedAccountId(
        availableAccounts.length === 1 ? availableAccounts[0].id : "",
      );

      setPaymentAmount(Number(invoice.balanceDue).toFixed(2));

      setPaymentDate(new Date().toISOString().slice(0, 10));

      setPaymentReference("");
      setPaymentNotes("");
      setPaymentOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cash/bank accounts.",
      );
    } finally {
      setAccountsLoading(false);
    }
  }

  function closePaymentForm() {
    if (paymentSubmitting) return;

    setPaymentOpen(false);
  }

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invoice) return;

    const amount = Number(paymentAmount);
    const balanceDue = Number(invoice.balanceDue);

    if (!selectedAccountId) {
      setError("Please select a cash/bank account.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (amount > balanceDue) {
      setError("Payment amount cannot exceed the outstanding balance.");
      return;
    }

    try {
      setPaymentSubmitting(true);
      setError("");

      await createCustomerPayment({
        serviceInvoiceId: invoice.id,
        accountId: selectedAccountId,
        amount,
        paymentDate: paymentDate
          ? new Date(`${paymentDate}T00:00:00`).toISOString()
          : undefined,
        referenceNo: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      const refreshedInvoice = await getServiceInvoice(invoice.id);

      setInvoice(refreshedInvoice);
      setPaymentOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record customer payment.",
      );
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="">
        <div className="">
          <div className="mb-6">
            <Link
              href="/service-invoices"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Service Invoices
            </Link>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to load invoice</p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Services</p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {invoice.invoiceNo}
                </h1>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  POSTED
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Service invoice generated from a completed repair job.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canRecordPayment && Number(invoice.balanceDue) > 0 && (
                <button
                  type="button"
                  onClick={() => void openPaymentForm()}
                  disabled={paymentSubmitting || accountsLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {accountsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4" />
                  )}
                  Record Payment
                </button>
              )}

              <Link
                href={`/service-jobs/${invoice.serviceJob.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <WrenchIcon />
                View Service Job
              </Link>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Invoice Information
                  </h2>

                  <p className="text-sm text-slate-500">
                    Core billing details and references
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label="Invoice Number"
                  value={<span className="font-mono">{invoice.invoiceNo}</span>}
                />

                <DetailItem
                  label="Invoice Date"
                  value={formatDateTime(invoice.invoiceDate)}
                />

                <DetailItem
                  label="Payment Mode"
                  value={formatPaymentMode(invoice.paymentMode)}
                />

                <DetailItem label="Customer" value={invoice.customer.name} />

                <DetailItem
                  label="Customer Code"
                  value={
                    <span className="font-mono">{invoice.customer.code}</span>
                  }
                />

                <DetailItem
                  label="Service Job"
                  value={
                    <Link
                      href={`/service-jobs/${invoice.serviceJob.id}`}
                      className="font-mono text-primary hover:text-blue-700"
                    >
                      {invoice.serviceJob.jobNo}
                    </Link>
                  }
                />

                <DetailItem
                  label="Branch"
                  value={`${invoice.branch.name} (${invoice.branch.code})`}
                />

                <DetailItem
                  label="Due Date"
                  value={formatDate(invoice.dueDate)}
                />

                <DetailItem
                  label="Created At"
                  value={formatDateTime(invoice.createdAt)}
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <DetailItem
                  label="Notes"
                  value={
                    invoice.notes || "No invoice notes have been recorded."
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Invoice Summary
                  </h2>

                  <p className="text-sm text-slate-500">Billing totals</p>
                </div>
              </div>

              <div className="space-y-4">
                <DetailItem
                  label="Subtotal"
                  value={formatCurrency(invoice.subtotal)}
                />

                <DetailItem
                  label="Discount"
                  value={formatCurrency(invoice.discount)}
                />

                <DetailItem label="Tax" value={formatCurrency(invoice.tax)} />

                <div className="border-t border-slate-100 pt-4">
                  <DetailItem
                    label="Invoice Total"
                    value={
                      <span className="text-xl font-bold text-slate-950">
                        {formatCurrency(invoice.total)}
                      </span>
                    }
                  />
                </div>

                <DetailItem
                  label="Amount Paid"
                  value={
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(invoice.amountPaid)}
                    </span>
                  }
                />

                <DetailItem
                  label="Balance Due"
                  value={
                    <span
                      className={
                        hasOutstandingBalance
                          ? "font-semibold text-red-600"
                          : "font-semibold text-emerald-600"
                      }
                    >
                      {formatCurrency(invoice.balanceDue)}
                    </span>
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <Package className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Invoice Items
                    </h2>

                    <p className="text-sm text-slate-500">
                      Labor and parts billed to the customer
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Type
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Description
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Product
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Quantity
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Unit Price
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                              item.itemType === "LABOR"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-cyan-50 text-cyan-700"
                            }`}
                          >
                            {formatItemType(item.itemType)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.description}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          {item.product ? (
                            <>
                              <p className="text-sm font-medium text-slate-700">
                                {item.product.name}
                              </p>

                              <p className="mt-1 font-mono text-[11px] text-slate-400">
                                {item.product.sku}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Service labor
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-sm text-slate-700">
                          {Number(item.quantity).toLocaleString("en-PH", {
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-sm text-slate-700">
                          {formatCurrency(item.unitPrice)}
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoice.items.length === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                  No invoice items were returned.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Customer
                  </h2>

                  <p className="text-sm text-slate-500">
                    Customer information for this invoice
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Customer" value={invoice.customer.name} />

                <DetailItem
                  label="Code"
                  value={
                    <span className="font-mono">{invoice.customer.code}</span>
                  }
                />

                <DetailItem
                  label="Contact Number"
                  value={invoice.customer.contactNumber || "—"}
                />

                <DetailItem
                  label="Email"
                  value={invoice.customer.email || "—"}
                />

                <DetailItem
                  label="Address"
                  value={invoice.customer.address || "—"}
                />

                <DetailItem
                  label="Tax ID"
                  value={invoice.customer.taxId || "—"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Accounts Receivable
                  </h2>

                  <p className="text-sm text-slate-500">
                    Credit billing status
                  </p>
                </div>
              </div>

              {invoice.accountsReceivable ? (
                <div className="space-y-4">
                  <DetailItem
                    label="Status"
                    value={invoice.accountsReceivable.status}
                  />

                  <DetailItem
                    label="Original Amount"
                    value={formatCurrency(
                      invoice.accountsReceivable.originalAmount,
                    )}
                  />

                  <DetailItem
                    label="Amount Paid"
                    value={formatCurrency(
                      invoice.accountsReceivable.amountPaid,
                    )}
                  />

                  <DetailItem
                    label="Balance Due"
                    value={formatCurrency(
                      invoice.accountsReceivable.balanceDue,
                    )}
                  />

                  <DetailItem
                    label="Due Date"
                    value={formatDate(invoice.accountsReceivable.dueDate)}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                  <p className="text-sm font-semibold text-slate-700">
                    No accounts receivable record
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This is expected for a cash service invoice.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-3">
              <div className="grid gap-5 sm:grid-cols-3">
                <DetailItem label="Labor Items" value={laborItems.length} />

                <DetailItem label="Part Items" value={partItems.length} />

                <DetailItem
                  label="Invoice Status"
                  value={
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Posted
                    </span>
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Banknote className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Record Customer Payment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Record a payment against this service invoice.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePaymentForm}
                disabled={paymentSubmitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close payment form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-5 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice
                    </p>

                    <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                      {invoice.invoiceNo}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice Total
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">
                      Balance Due
                    </p>

                    <p className="mt-1 text-sm font-bold text-red-600">
                      {formatCurrency(invoice.balanceDue)}
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Cash / Bank Account <span className="text-red-500">*</span>
                  </span>

                  <SearchableSelect
                    value={selectedAccountId}
                    onChange={setSelectedAccountId}
                    options={accounts.map<SelectOption>((account) => ({
                      value: account.id,
                      label: account.name,
                      description: `${account.accountType}${
                        account.accountNumber
                          ? ` • ${account.accountNumber}`
                          : ""
                      }`,
                    }))}
                    placeholder={
                      accounts.length
                        ? "Select cash/bank account..."
                        : "No active accounts available"
                    }
                    searchPlaceholder="Search cash/bank account..."
                    emptyMessage="No active account found for this branch."
                    disabled={
                      paymentSubmitting ||
                      accountsLoading ||
                      accounts.length === 0
                    }
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
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
                        min="0.01"
                        max={Number(invoice.balanceDue)}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(event) =>
                          setPaymentAmount(event.target.value)
                        }
                        disabled={paymentSubmitting}
                        placeholder="0.00"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(Number(invoice.balanceDue).toFixed(2))
                      }
                      disabled={paymentSubmitting}
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Use full balance
                    </button>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Payment Date
                    </span>

                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      disabled={paymentSubmitting}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Reference No.
                  </span>

                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    disabled={paymentSubmitting}
                    placeholder="e.g. OR no., bank reference, receipt no."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </span>

                  <textarea
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    rows={4}
                    disabled={paymentSubmitting}
                    placeholder="Optional payment notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    Posting this payment
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    This will immediately record the customer payment, reduce
                    the service invoice balance, and record a cash/bank inflow.
                    {invoice.accountsReceivable
                      ? " The linked Accounts Receivable balance will also be updated."
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePaymentForm}
                  disabled={paymentSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    paymentSubmitting ||
                    !selectedAccountId ||
                    !paymentAmount ||
                    Number(paymentAmount) <= 0
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paymentSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {paymentSubmitting
                    ? "Posting Payment..."
                    : "Post Customer Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function WrenchIcon() {
  return <WrenchGlyph />;
}

function WrenchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a5 5 0 0 0-6.4 6.4l-4.6 4.6a2.1 2.1 0 0 0 3 3l4.6-4.6a5 5 0 0 0 6.4-6.4l-2.1 2.1-3-3z" />
    </svg>
  );
}
