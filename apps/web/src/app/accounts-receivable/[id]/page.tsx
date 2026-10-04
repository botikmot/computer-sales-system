"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getAccountsReceivableById,
  type AccountsReceivable,
} from "@/features/sales/accounts-receivable-api";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function formatStatus(status: AccountsReceivable["status"]) {
  switch (status) {
    case "OPEN":
      return "Open";

    case "PARTIALLY_PAID":
      return "Partially Paid";

    case "PAID":
      return "Paid";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

function getStatusClass(status: AccountsReceivable["status"]) {
  switch (status) {
    case "OPEN":
      return "bg-blue-50 text-blue-700";

    case "PARTIALLY_PAID":
      return "bg-amber-50 text-amber-700";

    case "PAID":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
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

function getInvoiceType(record: AccountsReceivable) {
  if (record.salesInvoice) {
    return "Sales Invoice";
  }

  if (record.serviceInvoice) {
    return "Service Invoice";
  }

  return "Invoice";
}

function getInvoiceNumber(record: AccountsReceivable) {
  return (
    record.salesInvoice?.invoiceNo ??
    record.serviceInvoice?.invoiceNo ??
    "No invoice"
  );
}

function getInvoiceHref(record: AccountsReceivable) {
  if (record.salesInvoice) {
    return `/sales/invoices/${record.salesInvoice.id}`;
  }

  if (record.serviceInvoice) {
    return `/service-invoices/${record.serviceInvoice.id}`;
  }

  return null;
}

export default function AccountsReceivableDetailPage() {
  const params = useParams<{ id: string }>();

  const id = params.id;

  const [record, setRecord] = useState<AccountsReceivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadRecord() {
      try {
        setLoading(true);
        setError("");

        const result = await getAccountsReceivableById(id);

        if (cancelled) {
          return;
        }

        setRecord(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load accounts receivable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecord();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading accounts receivable...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!record) {
    return (
      <AppShell>
        <div className="space-y-5 pb-10">
          <Link
            href="/accounts-receivable"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts Receivable
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load accounts receivable
              </p>

              <p className="mt-1">
                {error || "Accounts receivable record was not found."}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const originalAmount = Number(record.originalAmount);
  const amountPaid = Number(record.amountPaid);
  const balanceDue = Number(record.balanceDue);

  const isPaid = record.status === "PAID";
  const hasOutstandingBalance = balanceDue > 0;

  const invoiceHref = getInvoiceHref(record);

  const invoiceDate =
    record.salesInvoice?.invoiceDate ??
    record.serviceInvoice?.invoiceDate ??
    null;

  const paymentMode =
    record.salesInvoice?.paymentMode ??
    record.serviceInvoice?.paymentMode ??
    null;

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/accounts-receivable"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts Receivable
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Finance</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {getInvoiceNumber(record)}
              </h1>

              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide",
                  getStatusClass(record.status),
                ].join(" ")}
              >
                {isPaid && <CheckCircle2 className="h-3.5 w-3.5" />}
                {formatStatus(record.status)}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Accounts receivable details for this customer invoice.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {invoiceHref && (
              <Link
                href={invoiceHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
              >
                <FileText className="h-4 w-4" />
                View {getInvoiceType(record)}
              </Link>
            )}

            {hasOutstandingBalance && (
              <Link
                href={invoiceHref ?? "/accounts-receivable"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <Banknote className="h-4 w-4" />
                Record Payment
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
              : hasOutstandingBalance
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-slate-50",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isPaid
                  ? "bg-emerald-100 text-emerald-600"
                  : hasOutstandingBalance
                    ? "bg-amber-100 text-amber-600"
                    : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {isPaid ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <WalletCards className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p
                className={[
                  "text-sm font-semibold",
                  isPaid
                    ? "text-emerald-800"
                    : hasOutstandingBalance
                      ? "text-amber-800"
                      : "text-slate-700",
                ].join(" ")}
              >
                {isPaid
                  ? "Receivable Fully Paid"
                  : hasOutstandingBalance
                    ? "Payment Outstanding"
                    : "Receivable Balance Cleared"}
              </p>

              <p
                className={[
                  "mt-1 text-sm",
                  isPaid
                    ? "text-emerald-700"
                    : hasOutstandingBalance
                      ? "text-amber-700"
                      : "text-slate-600",
                ].join(" ")}
              >
                {hasOutstandingBalance
                  ? `${formatCurrency(balanceDue)} remains outstanding.`
                  : "There is no remaining receivable balance."}
              </p>
            </div>
          </div>
        </section>

        {/* TOP DETAILS */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Receivable Information
                </h2>

                <p className="text-sm text-slate-500">
                  Core receivable and invoice details
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                label="Invoice Number"
                value={
                  <span className="font-mono">{getInvoiceNumber(record)}</span>
                }
              />

              <DetailItem label="Invoice Type" value={getInvoiceType(record)} />

              <DetailItem
                label="Payment Mode"
                value={formatPaymentMode(paymentMode)}
              />

              <DetailItem
                label="Invoice Date"
                value={formatDateTime(invoiceDate)}
              />

              <DetailItem label="Due Date" value={formatDate(record.dueDate)} />

              <DetailItem
                label="Branch"
                value={`${record.branch.name} (${record.branch.code})`}
              />

              <DetailItem
                label="Created At"
                value={formatDateTime(record.createdAt)}
              />

              <DetailItem
                label="Updated At"
                value={formatDateTime(record.updatedAt)}
              />

              <DetailItem
                label="Receivable Status"
                value={
                  <span
                    className={[
                      "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
                      getStatusClass(record.status),
                    ].join(" ")}
                  >
                    {formatStatus(record.status)}
                  </span>
                }
              />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <DetailItem
                label="Notes"
                value={
                  record.notes || "No receivable notes have been recorded."
                }
              />
            </div>
          </section>

          {/* SUMMARY */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ReceiptText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Receivable Summary
                </h2>

                <p className="text-sm text-slate-500">
                  Outstanding customer balance
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <DetailItem
                label="Original Amount"
                value={formatCurrency(originalAmount)}
              />

              <DetailItem
                label="Amount Paid"
                value={
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(amountPaid)}
                  </span>
                }
              />

              <div className="border-t border-slate-100 pt-5">
                <DetailItem
                  label="Balance Due"
                  value={
                    <span
                      className={[
                        "text-xl font-bold",
                        balanceDue > 0
                          ? "text-amber-600"
                          : balanceDue < 0
                            ? "text-rose-600"
                            : "text-emerald-600",
                      ].join(" ")}
                    >
                      {formatCurrency(balanceDue)}
                    </span>
                  }
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Paid Percentage</span>

                  <span className="font-semibold text-slate-800">
                    {originalAmount > 0
                      ? `${Math.min(
                          100,
                          Math.max(0, (amountPaid / originalAmount) * 100),
                        ).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* CUSTOMER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Customer
              </h2>

              <p className="text-sm text-slate-500">
                Customer information for this receivable
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Customer" value={record.customer.name} />

            <DetailItem
              label="Customer Code"
              value={<span className="font-mono">{record.customer.code}</span>}
            />

            <DetailItem label="Branch" value={record.branch.name} />

            <DetailItem label="Invoice Type" value={getInvoiceType(record)} />
          </div>
        </section>

        {/* SOURCE INVOICE */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label="Source Invoice"
              value={
                invoiceHref ? (
                  <Link
                    href={invoiceHref}
                    className="font-mono font-semibold text-primary hover:underline"
                  >
                    {getInvoiceNumber(record)}
                  </Link>
                ) : (
                  getInvoiceNumber(record)
                )
              }
            />

            <DetailItem label="Source Type" value={getInvoiceType(record)} />

            <DetailItem label="Invoice Date" value={formatDate(invoiceDate)} />

            <DetailItem label="Due Date" value={formatDate(record.dueDate)} />
          </div>
        </section>

        {/* FINANCE NOTE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />

            <div>
              <h2 className="font-semibold text-slate-950">
                Receivable Tracking
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Customer payments are recorded against the linked invoice. For
                credit transactions, the corresponding Accounts Receivable
                balance is updated together with the invoice payment balance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
