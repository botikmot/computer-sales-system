"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  createPaymentVoucherFromSupplierPayment,
  getSupplierPayment,
  type PaymentVoucher,
  type SupplierPayment,
} from "@/features/purchasing/supplier-payments-api";

type PageState = "loading" | "ready" | "error";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPaymentModeLabel(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function SupplierPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = params.id;
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState("");

  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucher, setVoucher] = useState<PaymentVoucher | null>(null);
  const [voucherError, setVoucherError] = useState("");

  useEffect(() => {
    if (!paymentId) return;

    let cancelled = false;

    async function loadPayment() {
      try {
        const result = await getSupplierPayment(paymentId);

        if (cancelled) return;

        setPayment(result);
        setPageState("ready");
        setError("");
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load supplier payment.",
        );
        setPageState("error");
      }
    }

    void loadPayment();

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  async function handleGenerateVoucher() {
    if (!payment) return;

    try {
      setVoucherLoading(true);
      setVoucherError("");

      const result = await createPaymentVoucherFromSupplierPayment(payment.id);

      setVoucher(result);
    } catch (err) {
      setVoucherError(
        err instanceof Error
          ? err.message
          : "Failed to generate payment voucher.",
      );
    } finally {
      setVoucherLoading(false);
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

          {pageState === "loading" && (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading supplier payment...
              </div>
            </div>
          )}

          {pageState === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-sm font-semibold text-red-800">
                Unable to load supplier payment
              </h2>

              <p className="mt-1 text-sm text-red-700">{error}</p>

              <Link
                href="/supplier-payments"
                className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Return to Supplier Payments
              </Link>
            </div>
          )}

          {pageState === "ready" && payment && (
            <>
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    Purchasing
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {payment.paymentNo}
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {payment.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Posted supplier payment recorded against accounts payable.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateVoucher}
                  disabled={voucherLoading || !!voucher}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {voucherLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ReceiptText className="h-4 w-4" />
                  )}

                  {voucher ? "Voucher Generated" : "Generate Payment Voucher"}
                </button>
              </div>

              {voucher && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Payment voucher generated successfully
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        Voucher No.{" "}
                        <span className="font-semibold">
                          {voucher.voucherNo}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {voucherError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">
                    {voucherError}
                  </p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Payment Information
                      </h2>

                      <p className="text-sm text-slate-500">
                        Core payment details and references
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <DetailItem
                      label="Payment Number"
                      value={payment.paymentNo}
                    />

                    <DetailItem
                      label="Payment Date"
                      value={formatDateTime(payment.paymentDate)}
                    />

                    <DetailItem
                      label="Reference No."
                      value={payment.referenceNo || "—"}
                    />

                    <DetailItem
                      label="Created At"
                      value={formatDateTime(payment.createdAt)}
                    />

                    <DetailItem
                      label="Account Type"
                      value={payment.accountType}
                    />

                    <DetailItem
                      label="Status"
                      value={
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {payment.status}
                        </span>
                      }
                    />
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <DetailItem
                      label="Notes"
                      value={payment.notes || "No notes recorded."}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <WalletCards className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Payment Amount
                      </h2>

                      <p className="text-sm text-slate-500">
                        Posted cash or bank outflow
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Amount
                    </p>

                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Supplier
                      </h2>

                      <p className="text-sm text-slate-500">
                        Supplier information
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <DetailItem
                      label="Supplier"
                      value={payment.supplier.name}
                    />

                    <DetailItem
                      label="Supplier Code"
                      value={payment.supplier.code}
                    />

                    <DetailItem
                      label="Contact Person"
                      value={payment.supplier.contactPerson || "—"}
                    />

                    <DetailItem
                      label="Contact Number"
                      value={payment.supplier.contactNumber || "—"}
                    />

                    <DetailItem
                      label="Email"
                      value={payment.supplier.email || "—"}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Branch
                      </h2>

                      <p className="text-sm text-slate-500">Payment branch</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <DetailItem label="Branch" value={payment.branch.name} />

                    <DetailItem
                      label="Branch Code"
                      value={payment.branch.code}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-1">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                      <CreditCard className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Cash / Bank
                      </h2>

                      <p className="text-sm text-slate-500">
                        Source of payment
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <DetailItem
                      label="Account"
                      value={payment.cashBankTransaction.accountName}
                    />

                    <DetailItem
                      label="Account Type"
                      value={payment.cashBankTransaction.accountType}
                    />

                    <DetailItem
                      label="Direction"
                      value={
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {payment.cashBankTransaction.direction}
                        </span>
                      }
                    />

                    <DetailItem
                      label="Transaction Type"
                      value={payment.cashBankTransaction.transactionType}
                    />

                    <DetailItem
                      label="Transaction Date"
                      value={formatDateTime(
                        payment.cashBankTransaction.transactionDate,
                      )}
                    />

                    <DetailItem
                      label="Reference"
                      value={
                        payment.cashBankTransaction.referenceNo ||
                        payment.referenceNo ||
                        "—"
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-slate-950">
                        Accounts Payable
                      </h2>

                      <p className="text-sm text-slate-500">
                        Outstanding supplier liability associated with this
                        payment
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem
                      label="A/P ID"
                      value={
                        <span className="font-mono text-xs">
                          {payment.accountsPayable.id}
                        </span>
                      }
                    />

                    <DetailItem
                      label="Payment Mode"
                      value={getPaymentModeLabel(
                        payment.accountsPayable.paymentMode,
                      )}
                    />

                    <DetailItem
                      label="A/P Status"
                      value={payment.accountsPayable.status}
                    />

                    <DetailItem
                      label="Original Amount"
                      value={formatCurrency(
                        payment.accountsPayable.originalAmount,
                      )}
                    />

                    <DetailItem
                      label="Amount Paid"
                      value={formatCurrency(payment.accountsPayable.amountPaid)}
                    />

                    <DetailItem
                      label="Balance Due"
                      value={formatCurrency(payment.accountsPayable.balanceDue)}
                    />

                    <DetailItem
                      label="Due Date"
                      value={formatDate(payment.accountsPayable.dueDate)}
                    />

                    <DetailItem
                      label="Invoice ID"
                      value={
                        <span className="font-mono text-xs">
                          {payment.accountsPayable.purchaseInvoiceId}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
