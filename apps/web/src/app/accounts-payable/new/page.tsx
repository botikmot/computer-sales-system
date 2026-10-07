"use client";

import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Save,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import { getCurrentUser } from "@/lib/auth/session";

import { createAccountsPayable } from "@/features/purchasing/accounts-payable-api";

import { getPurchaseInvoice } from "@/features/purchasing/purchase-invoices-api";

type PurchaseInvoice = Awaited<ReturnType<typeof getPurchaseInvoice>>;

const NO_SOURCE_INVOICE_MESSAGE =
  "No supplier invoice was selected. Please create the A/P from a posted supplier invoice.";

const ACCESS_DENIED_MESSAGE =
  "You do not have permission to create Accounts Payable.";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
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

function formatPaymentMode(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string | null | undefined) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "DRAFT":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function AccountsPayableNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUser = getCurrentUser();

  const canCreateAccountsPayable =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const purchaseInvoiceId = searchParams.get("purchaseInvoiceId");

  const initialError = !canCreateAccountsPayable
    ? ACCESS_DENIED_MESSAGE
    : purchaseInvoiceId
      ? null
      : NO_SOURCE_INVOICE_MESSAGE;

  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);

  const [loading, setLoading] = useState(
    Boolean(purchaseInvoiceId && canCreateAccountsPayable),
  );

  const [error, setError] = useState<string | null>(initialError);

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!purchaseInvoiceId || !canCreateAccountsPayable) {
      return;
    }

    const invoiceId = purchaseInvoiceId;
    let cancelled = false;

    async function loadInvoice() {
      try {
        const result = await getPurchaseInvoice(invoiceId);

        if (cancelled) {
          return;
        }

        if (result.status !== "POSTED") {
          setError(
            "Only POSTED supplier invoices can be converted into Accounts Payable.",
          );
          setInvoice(null);
          return;
        }

        if (Number(result.balanceDue) <= 0) {
          setError(
            "This supplier invoice has no remaining balance to record as Accounts Payable.",
          );
          setInvoice(null);
          return;
        }

        setInvoice(result);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the supplier invoice.",
        );

        setInvoice(null);
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
  }, [purchaseInvoiceId, canCreateAccountsPayable]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invoice) {
      return;
    }

    if (!canCreateAccountsPayable) {
      setError(ACCESS_DENIED_MESSAGE);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const created = await createAccountsPayable({
        purchaseInvoiceId: invoice.id,
        notes: notes.trim() || undefined,
      });

      router.push(`/accounts-payable/${created.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create Accounts Payable.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canCreateAccountsPayable) {
    return (
      <AppShell>
        <div className="space-y-6 pb-8">
          <section>
            <Link
              href="/accounts-payable"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Accounts Payable
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">Finance</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Create Accounts Payable
            </h1>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-900">
                  Access denied
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {ACCESS_DENIED_MESSAGE}
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
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <section>
          <Link
            href="/accounts-payable"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts Payable
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold text-primary">Finance</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Create Accounts Payable
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record a payable from a posted supplier invoice.
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
                  Unable to create Accounts Payable
                </p>

                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* LOADING */}
        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading supplier invoice...
              </div>
            </div>
          </section>
        ) : invoice ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SOURCE INVOICE */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-950">
                        Source Supplier Invoice
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500">
                        This invoice will become the Accounts Payable record.
                      </p>
                    </div>
                  </div>

                  <span
                    className={[
                      "inline-flex w-fit items-center rounded-lg border px-2.5 py-1 text-xs font-semibold",
                      getStatusClass(invoice.status),
                    ].join(" ")}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem
                    label="Invoice No."
                    value={
                      <span className="font-mono">{invoice.invoiceNo}</span>
                    }
                  />

                  <InfoItem
                    label="Supplier Invoice No."
                    value={
                      <span className="font-mono">
                        {invoice.supplierInvoiceNo || "—"}
                      </span>
                    }
                  />

                  <InfoItem
                    label="Supplier"
                    value={
                      <div>
                        <div>{invoice.supplier.name}</div>

                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          {invoice.supplier.code}
                        </div>
                      </div>
                    }
                  />

                  <InfoItem
                    label="Branch"
                    value={
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />

                        <span>
                          {invoice.branch.code} — {invoice.branch.name}
                        </span>
                      </div>
                    }
                  />

                  <InfoItem
                    label="Purchase Order"
                    value={
                      invoice.purchaseOrder ? (
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-slate-400" />

                          <span>{invoice.purchaseOrder.poNumber}</span>
                        </div>
                      ) : (
                        "—"
                      )
                    }
                  />

                  <InfoItem
                    label="Receiving"
                    value={
                      invoice.receiving ? (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-slate-400" />

                          <span>{invoice.receiving.receivingNo}</span>
                        </div>
                      ) : (
                        "—"
                      )
                    }
                  />

                  <InfoItem
                    label="Invoice Date"
                    value={
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />

                        <span>{formatDate(invoice.invoiceDate)}</span>
                      </div>
                    }
                  />

                  <InfoItem
                    label="Due Date"
                    value={
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />

                        <span>{formatDate(invoice.dueDate)}</span>
                      </div>
                    }
                  />

                  <InfoItem
                    label="Payment Mode"
                    value={formatPaymentMode(invoice.paymentMode)}
                  />
                </div>
              </div>
            </section>

            {/* FINANCIAL SUMMARY */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-950">
                  Payable Amount
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Amounts are carried over from the supplier invoice.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Invoice Total
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Amount Paid
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-700">
                    {formatCurrency(invoice.amountPaid)}
                  </p>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
                    Balance to Record
                  </p>

                  <p className="mt-2 text-xl font-bold text-violet-700">
                    {formatCurrency(invoice.balanceDue)}
                  </p>
                </div>
              </div>
            </section>

            {/* NOTES */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-950">A/P Notes</h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Optional internal notes for this payable record.
                </p>
              </div>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Enter any internal notes..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </section>

            {/* ACTIONS */}
            <section className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/accounts-payable"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || loading || !invoice}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating A/P...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Accounts Payable
                  </>
                )}
              </button>
            </section>
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <CheckCircle2 className="h-5 w-5 text-slate-400" />
              </div>

              <h2 className="mt-4 text-base font-bold text-slate-950">
                No supplier invoice available
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {error ?? NO_SOURCE_INVOICE_MESSAGE}
              </p>

              <Link
                href="/accounts-payable"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to Accounts Payable
              </Link>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

export default function AccountsPayableNewPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Accounts Payable...
            </div>
          </div>
        </AppShell>
      }
    >
      <AccountsPayableNewContent />
    </Suspense>
  );
}
