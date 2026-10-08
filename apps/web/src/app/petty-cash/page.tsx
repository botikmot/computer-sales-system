"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CircleDollarSign,
  ClipboardList,
  Loader2,
  Plus,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getPettyCashFunds,
  type PettyCashFund,
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

function getFundStatusClass(status: PettyCashFund["status"]) {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

function getBalanceTone(
  currentBalance: string | number,
  openingBalance: string | number,
) {
  const current = Number(currentBalance);
  const opening = Number(openingBalance);

  if (!Number.isFinite(current) || !Number.isFinite(opening)) {
    return "text-slate-950";
  }

  if (current <= 0) {
    return "text-rose-600";
  }

  if (current < opening) {
    return "text-amber-600";
  }

  return "text-emerald-600";
}

function FundCard({ fund }: { fund: PettyCashFund }) {
  const openingBalance = Number(fund.openingBalance);
  const currentBalance = Number(fund.currentBalance);

  const utilizedAmount = Math.max(0, openingBalance - currentBalance);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Banknote className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {fund.name}
            </p>

            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              {fund.fundNo}
            </p>
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            getFundStatusClass(fund.status),
          ].join(" ")}
        >
          {fund.status === "ACTIVE" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Current Balance
        </p>

        <p
          className={[
            "mt-1 text-2xl font-bold tracking-tight",
            getBalanceTone(fund.currentBalance, fund.openingBalance),
          ].join(" ")}
        >
          {formatCurrency(fund.currentBalance)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Opening Float
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatCurrency(fund.openingBalance)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Utilized
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatCurrency(utilizedAmount)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Custodian
            </p>

            <p className="mt-1 truncate text-sm font-medium text-slate-700">
              {fund.custodian?.fullName ||
                fund.custodian?.username ||
                "Not assigned"}
            </p>
          </div>

          <Link
            href={`/petty-cash/${fund.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
          >
            View Fund
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-slate-400">
        Updated {formatDate(fund.updatedAt)}
      </div>
    </div>
  );
}

export default function PettyCashPage() {
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFunds() {
      try {
        setLoading(true);
        setError("");

        const result = await getPettyCashFunds();

        if (cancelled) {
          return;
        }

        setFunds(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load petty cash funds.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFunds();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalOpening = funds.reduce(
    (sum, fund) => sum + Number(fund.openingBalance || 0),
    0,
  );

  const totalCurrent = funds.reduce(
    (sum, fund) => sum + Number(fund.currentBalance || 0),
    0,
  );

  const totalUtilized = Math.max(0, totalOpening - totalCurrent);

  const activeFunds = funds.filter((fund) => fund.status === "ACTIVE").length;

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* HEADER */}
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Finance</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Petty Cash
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage petty cash funds, balances, and fund activity.
              </p>
            </div>

            <Link
              href="/petty-cash/funds/new"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Fund
            </Link>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Total Funds
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {funds.length}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <WalletCards className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Active Funds
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {activeFunds}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Opening Float
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {formatCurrency(totalOpening)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Current Balance
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {formatCurrency(totalCurrent)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">
              Petty Cash warning
            </p>

            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </section>
        )}

        {/* FUNDS */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Petty Cash Funds
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Current fund balances and assigned custodians.
              </p>
            </div>

            {!loading && (
              <span className="text-xs font-medium text-slate-400">
                {funds.length} fund{funds.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading petty cash funds...
              </div>
            </div>
          ) : funds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Banknote className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-900">
                No petty cash funds found
              </p>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                There are currently no petty cash funds available for your
                accessible branch.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {funds.map((fund) => (
                <FundCard key={fund.id} fund={fund} />
              ))}
            </div>
          )}
        </section>

        {/* UTILIZATION */}
        {!loading && funds.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Current Difference From Opening Float
                </p>

                <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                  {formatCurrency(totalUtilized)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Combined difference between opening and current petty cash
                  balances.
                </p>
              </div>

              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:flex">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
