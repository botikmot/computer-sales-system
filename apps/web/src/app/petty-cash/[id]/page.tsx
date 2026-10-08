"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Plus,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getPettyCashFund,
  postPettyCashVoucher,
  voidPettyCashVoucher,
  postPettyCashReplenishment,
  type PettyCashFund,
  type PettyCashReplenishment,
  type PettyCashVoucher,
} from "@/features/petty-cash/petty-cash-api";

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

/* function formatAccountType(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
} */

function getVoucherStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "VOIDED":
      return "bg-rose-50 text-rose-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getReplenishmentStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

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

function VoucherCard({
  voucher,
  processing,
  onPost,
  onVoid,
}: {
  voucher: PettyCashVoucher;
  processing: boolean;
  onPost: (voucher: PettyCashVoucher) => void;
  onVoid: (voucher: PettyCashVoucher) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700">
              {voucher.voucherNo}
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                getVoucherStatusClass(voucher.status),
              ].join(" ")}
            >
              {voucher.status}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-950">
            {voucher.description}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{formatDate(voucher.expenseDate)}</span>
            <span>{voucher.category}</span>

            {voucher.payee && <span>Payee: {voucher.payee}</span>}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Expense
          </p>

          <p className="mt-1 font-mono text-lg font-bold text-rose-600">
            -{formatCurrency(voucher.amount)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          {voucher.referenceNo && (
            <span>
              Reference:{" "}
              <span className="font-mono text-slate-600">
                {voucher.referenceNo}
              </span>
            </span>
          )}

          <span>Created: {formatDateTime(voucher.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {voucher.status === "DRAFT" && (
            <button
              type="button"
              disabled={processing}
              onClick={() => onPost(voucher)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Posting..." : "Post Voucher"}
            </button>
          )}

          {voucher.status === "POSTED" && (
            <button
              type="button"
              disabled={processing}
              onClick={() => onVoid(voucher)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Voiding..." : "Void Voucher"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplenishmentCard({
  replenishment,
  onPost,
  processingId,
}: {
  replenishment: PettyCashReplenishment;
  onPost: (id: string) => void;
  processingId: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700">
              {replenishment.replenishmentNo}
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                getReplenishmentStatusClass(replenishment.status),
              ].join(" ")}
            >
              {replenishment.status}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-950">
            {replenishment.notes || "Petty cash fund replenishment"}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{formatDate(replenishment.replenishmentDate)}</span>

            {replenishment.account && (
              <span>Source: {replenishment.account.name}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Replenishment
          </p>

          <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
            +{formatCurrency(replenishment.amount)}
          </p>

          {replenishment.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => onPost(replenishment.id)}
              disabled={processingId === replenishment.id}
              className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processingId === replenishment.id
                ? "Posting..."
                : "Post Replenishment"}
            </button>
          )}
        </div>
      </div>

      {(replenishment.referenceNo || replenishment.createdAt) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
          {replenishment.referenceNo && (
            <span>
              Reference:{" "}
              <span className="font-mono text-slate-600">
                {replenishment.referenceNo}
              </span>
            </span>
          )}

          <span>Created: {formatDateTime(replenishment.createdAt)}</span>
        </div>
      )}
    </div>
  );
}

export default function PettyCashFundDetailPage() {
  const params = useParams<{ id: string }>();
  const fundId = params.id;

  const [fund, setFund] = useState<PettyCashFund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorTitle, setErrorTitle] = useState("Unable to load fund");

  const [processingVoucherId, setProcessingVoucherId] = useState<string | null>(
    null,
  );

  const [processingReplenishmentId, setProcessingReplenishmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFund() {
      try {
        setLoading(true);
        setError("");

        const result = await getPettyCashFund(fundId);

        if (cancelled) {
          return;
        }

        setFund(result);
      } catch (err) {
        if (!cancelled) {
          setErrorTitle("Unable to load fund");

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load petty cash fund.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (fundId) {
      void loadFund();
    }

    return () => {
      cancelled = true;
    };
  }, [fundId]);

  async function handlePostVoucher(voucher: PettyCashVoucher) {
    const confirmed = window.confirm(
      `Post voucher ${voucher.voucherNo} for ${formatCurrency(
        voucher.amount,
      )}? This will reduce the petty cash fund balance.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setProcessingVoucherId(voucher.id);

      await postPettyCashVoucher(voucher.id);

      const refreshedFund = await getPettyCashFund(fundId);

      setFund(refreshedFund);
    } catch (err) {
      setErrorTitle("Unable to post voucher");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to post petty cash voucher.",
      );
    } finally {
      setProcessingVoucherId(null);
    }
  }

  async function handlePostReplenishment(id: string) {
    try {
      setProcessingReplenishmentId(id);
      setError("");

      await postPettyCashReplenishment(id);

      const refreshedFund = await getPettyCashFund(fundId);
      setFund(refreshedFund);
    } catch (err) {
      setErrorTitle("Unable to post replenishment");

      setError(
        err instanceof Error ? err.message : "Unable to post replenishment.",
      );
    } finally {
      setProcessingReplenishmentId(null);
    }
  }

  async function handleVoidVoucher(voucher: PettyCashVoucher) {
    const confirmed = window.confirm(
      `Void voucher ${voucher.voucherNo} for ${formatCurrency(
        voucher.amount,
      )}? The amount will be restored to the petty cash fund balance.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setProcessingVoucherId(voucher.id);

      await voidPettyCashVoucher(voucher.id);

      const refreshedFund = await getPettyCashFund(fundId);

      setFund(refreshedFund);
    } catch (err) {
      setErrorTitle("Unable to void voucher");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to void petty cash voucher.",
      );
    } finally {
      setProcessingVoucherId(null);
    }
  }

  const vouchers = fund?.vouchers ?? [];

  const replenishments = fund?.replenishments ?? [];

  const postedVouchers =
    fund?.vouchers?.filter((voucher) => voucher.status === "POSTED") ?? [];

  const postedReplenishments =
    fund?.replenishments?.filter(
      (replenishment) => replenishment.status === "POSTED",
    ) ?? [];

  const totalExpenses = postedVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.amount || 0),
    0,
  );

  const totalReplenishments = postedReplenishments.reduce(
    (sum, replenishment) => sum + Number(replenishment.amount || 0),
    0,
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading petty cash fund...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !fund) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/petty-cash"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Petty Cash
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-800">{errorTitle}</p>

            <p className="mt-1 text-sm text-rose-700">
              {error || "Petty cash fund not found."}
            </p>
          </div>
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
            href="/petty-cash"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Petty Cash
          </Link>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                Finance / Petty Cash
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {fund.name}
                </h1>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    fund.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {fund.status}
                </span>
              </div>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {fund.fundNo}
              </p>
            </div>
          </div>
        </section>

        {/* BALANCE SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Opening Float
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {formatCurrency(fund.openingBalance)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Current Balance
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight">
              {formatCurrency(fund.currentBalance)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Posted Expenses
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Replenishments
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
              {formatCurrency(totalReplenishments)}
            </p>
          </div>
        </section>

        {/* FUND INFORMATION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <WalletCards className="h-5 w-5 text-primary" />

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Fund Information
              </h2>

              <p className="text-sm text-slate-500">
                Basic details for this petty cash fund.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label="Fund Number"
              value={<span className="font-mono">{fund.fundNo}</span>}
            />

            <DetailItem
              label="Branch ID"
              value={<span className="font-mono text-xs">{fund.branchId}</span>}
            />

            <DetailItem
              label="Custodian"
              value={
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  {fund.custodian?.fullName ||
                    fund.custodian?.username ||
                    "Not assigned"}
                </span>
              }
            />

            <DetailItem
              label="Last Updated"
              value={
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {formatDateTime(fund.updatedAt)}
                </span>
              }
            />
          </div>
        </section>

        {/* VOUCHERS */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <ArrowUpRight className="h-5 w-5 text-rose-500" />

                <h2 className="text-base font-semibold text-slate-950">
                  Petty Cash Expenses
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Posted petty cash vouchers charged against this fund.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                {postedVouchers.length} posted
              </span>

              {fund.status === "ACTIVE" && (
                <Link
                  href={`/petty-cash/${fund.id}/vouchers/new`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Expense
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {vouchers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <FileText className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  No posted expenses
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No petty cash expense vouchers have been posted for this fund.
                </p>
              </div>
            ) : (
              vouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  processing={processingVoucherId === voucher.id}
                  onPost={handlePostVoucher}
                  onVoid={handleVoidVoucher}
                />
              ))
            )}
          </div>
        </section>

        {/* REPLENISHMENTS */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />

                <h2 className="text-base font-semibold text-slate-950">
                  Replenishments
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Petty cash replenishments added back to this fund.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {replenishments.some(
                (replenishment) => replenishment.status === "DRAFT",
              ) && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {
                    replenishments.filter(
                      (replenishment) => replenishment.status === "DRAFT",
                    ).length
                  }{" "}
                  draft
                  {replenishments.filter(
                    (replenishment) => replenishment.status === "DRAFT",
                  ).length !== 1
                    ? "s"
                    : ""}
                </span>
              )}

              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                {postedReplenishments.length} posted
              </span>

              {fund.status === "ACTIVE" && (
                <Link
                  href={`/petty-cash/${fund.id}/replenishments/new`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Replenish Fund
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-2">
            {replenishments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <CircleDollarSign className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  No replenishments yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No petty cash replenishment records have been created for this
                  fund.
                </p>
              </div>
            ) : (
              replenishments.map((replenishment) => (
                <ReplenishmentCard
                  key={replenishment.id}
                  replenishment={replenishment}
                  onPost={handlePostReplenishment}
                  processingId={processingReplenishmentId}
                />
              ))
            )}
          </div>
        </section>

        {/* ACCOUNTING NOTE */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Fund balance control
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Posted vouchers decrease the petty cash fund balance, while
                posted replenishments increase it. The backend also prevents
                posting an expense when the fund has insufficient available
                balance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
