"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Truck,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import type { DashboardData } from "./dashboard-api";
import { getDashboardData } from "./dashboard-api";

import { NewTransactionMenu } from "@/components/dashboard/new-transaction-menu";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = getCurrentUser();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [newTransactionOpen, setNewTransactionOpen] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const result = await getDashboardData();

        if (!cancelled) {
          setDashboard(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();

  const displayName = user?.fullName?.trim() || user?.username || "User";

  const dateLabel = now.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const greeting = getGreeting(now.getHours());

  const weeklyValues = dashboard?.sales.weekly.map((item) => item.value) ?? [];

  const maxWeeklyValue = Math.max(...weeklyValues, 1);

  const tasks = dashboard
    ? [
        dashboard.orders.readyForRelease !== null
          ? {
              label: "Orders waiting for release",
              count: dashboard.orders.readyForRelease,
              icon: Truck,
              className: "bg-rose-50 text-rose-600",
            }
          : null,

        dashboard.purchasing.toReceive !== null
          ? {
              label: "Purchase orders to receive",
              count: dashboard.purchasing.toReceive,
              icon: Package,
              className: "bg-amber-50 text-amber-600",
            }
          : null,

        dashboard.receivables.outstandingAccounts !== null
          ? {
              label: "Outstanding customer accounts",
              count: dashboard.receivables.outstandingAccounts,
              icon: CreditCard,
              className: "bg-blue-50 text-blue-600",
            }
          : null,

        dashboard.service.inProgress !== null
          ? {
              label: "Service jobs in progress",
              count: dashboard.service.inProgress,
              icon: Wrench,
              className: "bg-violet-50 text-violet-600",
            }
          : null,
      ].filter(Boolean)
    : [];

  const stats = dashboard
    ? [
        {
          label: "Today's Sales",
          value: formatCurrency(dashboard.sales.todayTotal),
          detail:
            dashboard.sales.todayTransactions === null
              ? "Not available for this role"
              : `${dashboard.sales.todayTransactions} transaction${
                  dashboard.sales.todayTransactions === 1 ? "" : "s"
                }`,
          icon: ShoppingCart,
          iconClass: "bg-blue-50 text-blue-600",
        },

        {
          label: "Open Orders",
          value:
            dashboard.orders.open === null
              ? "—"
              : dashboard.orders.open.toLocaleString(),
          detail:
            dashboard.orders.readyForRelease === null
              ? "Not available for this role"
              : `${dashboard.orders.readyForRelease} ready for release`,
          icon: ClipboardList,
          iconClass: "bg-violet-50 text-violet-600",
        },

        {
          label: "Customer Balances",
          value: formatCurrency(dashboard.receivables.totalBalance),
          detail:
            dashboard.receivables.outstandingAccounts === null
              ? "Not available for this role"
              : `${
                  dashboard.receivables.outstandingAccounts
                } outstanding account${
                  dashboard.receivables.outstandingAccounts === 1 ? "" : "s"
                }`,
          icon: CreditCard,
          iconClass: "bg-amber-50 text-amber-600",
        },

        {
          label: "Low Stock",
          value:
            dashboard.lowStock.count === null
              ? "—"
              : dashboard.lowStock.count.toLocaleString(),
          detail:
            dashboard.lowStock.count === null
              ? "Not available for this role"
              : `Threshold: ${dashboard.lowStock.threshold} units`,
          icon: Boxes,
          iconClass: "bg-rose-50 text-rose-600",
        },
      ]
    : [];

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* =================================================
            HEADER
        ================================================== */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">{dateLabel}</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {greeting}, {displayName}!
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Here&apos;s a quick look at your business and what needs your
              attention today.
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNewTransactionOpen((current) => !current)}
              aria-expanded={newTransactionOpen}
              aria-haspopup="menu"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </button>

            {newTransactionOpen && (
              <NewTransactionMenu
                onClose={() => setNewTransactionOpen(false)}
              />
            )}
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================== */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">
                Dashboard data could not be loaded
              </p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* =================================================
            KPI CARDS
        ================================================== */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <article
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <div className="animate-pulse">
                    <div className="h-4 w-28 rounded bg-slate-100" />

                    <div className="mt-4 h-8 w-32 rounded bg-slate-100" />

                    <div className="mt-5 h-3 w-40 rounded bg-slate-100" />
                  </div>
                </article>
              ))
            : stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <article
                    key={stat.label}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500">
                          {stat.label}
                        </p>

                        <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
                          {stat.value}
                        </p>
                      </div>

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="truncate text-xs text-slate-500">
                        {stat.detail}
                      </p>
                    </div>
                  </article>
                );
              })}
        </section>

        {/* =================================================
            MAIN DASHBOARD GRID
            LEFT:
              Quick Actions
              Sales Overview
              Recent Sales

            RIGHT:
              Today's Tasks
              Inventory Attention
        ================================================== */}
        <section className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* =================================================
              LEFT COLUMN
          ================================================== */}
          <div className="min-w-0 space-y-6">
            {/* -------------------------------------------------
                QUICK ACTIONS
            ------------------------------------------------- */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-950">Quick Actions</h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Common tasks, one click away
                </p>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {[
                  {
                    label: "New Quotation",
                    description: "Prepare a customer quote",
                    icon: ClipboardList,
                  },
                  {
                    label: "New Sales Order",
                    description: "Create a confirmed order",
                    icon: ShoppingCart,
                  },
                  {
                    label: "Receive Stock",
                    description: "Record incoming inventory",
                    icon: Package,
                  },
                  {
                    label: "New Service Job",
                    description: "Start a repair job",
                    icon: Wrench,
                  },
                ].map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="group flex min-h-[72px] items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 transition group-hover:bg-blue-100 group-hover:text-primary">
                        <Icon className="h-4.5 w-4.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {action.label}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {action.description}
                        </p>
                      </div>

                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>
            </article>

            {/* -------------------------------------------------
                SALES OVERVIEW
            ------------------------------------------------- */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Sales Overview
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Sales activity for the current week
                  </p>
                </div>

                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:text-blue-700"
                >
                  View report
                </button>
              </div>

              <div className="px-5 pb-5 pt-6">
                {loading ? (
                  <div className="flex h-[220px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : dashboard?.sales.weekly.length ? (
                  <div className="flex h-[220px] items-end gap-3 sm:gap-5">
                    {dashboard.sales.weekly.map((item) => {
                      const height =
                        item.value === 0
                          ? 6
                          : Math.max(10, (item.value / maxWeeklyValue) * 100);

                      return (
                        <div
                          key={item.key}
                          className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                        >
                          <div className="flex h-full w-full items-end">
                            <div
                              className={`w-full rounded-t-lg transition-all ${
                                item.value === maxWeeklyValue && item.value > 0
                                  ? "bg-primary hover:bg-blue-700"
                                  : "bg-primary/15 hover:bg-primary/30"
                              }`}
                              style={{
                                height: `${height}%`,
                              }}
                              title={`${item.label}: ${formatCurrency(
                                item.value,
                              )}`}
                            />
                          </div>

                          <span className="text-[11px] font-medium text-slate-400">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                    No sales data available.
                  </div>
                )}
              </div>
            </article>

            {/* -------------------------------------------------
                RECENT SALES
            ------------------------------------------------- */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Recent Sales</h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Latest posted sales invoices
                  </p>
                </div>

                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:text-blue-700"
                >
                  View all
                </button>
              </div>

              {loading ? (
                <div className="space-y-4 p-5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex animate-pulse items-center gap-4"
                    >
                      <div className="flex-1">
                        <div className="h-3 w-48 rounded bg-slate-100" />

                        <div className="mt-2 h-2.5 w-32 rounded bg-slate-100" />
                      </div>

                      <div className="h-3 w-20 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : dashboard?.transactions.length ? (
                <div className="divide-y divide-slate-100">
                  {dashboard.transactions.map((transaction) => (
                    <div
                      key={transaction.reference}
                      className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-slate-900">
                          {transaction.reference}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.customer} ·{" "}
                          {formatDateTime(transaction.date)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {formatCurrency(transaction.amount)}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
                            transaction.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  No sales invoices available.
                </div>
              )}
            </article>
          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================== */}
          <div className="min-w-0 space-y-6">
            {/* -------------------------------------------------
                TODAY'S TASKS
            ------------------------------------------------- */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Today&apos;s Tasks
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Items that need your attention
                  </p>
                </div>

                <Bell className="h-5 w-5 text-slate-400" />
              </div>

              {loading ? (
                <div className="space-y-4 p-5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex animate-pulse items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100" />

                      <div className="flex-1">
                        <div className="h-3 w-40 rounded bg-slate-100" />

                        <div className="mt-2 h-2.5 w-24 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tasks.length ? (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    if (!task) {
                      return null;
                    }

                    const Icon = task.icon;

                    return (
                      <button
                        key={task.label}
                        type="button"
                        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${task.className}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {task.label}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Requires attention
                          </p>
                        </div>

                        <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-bold text-slate-700">
                          {task.count}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    You&apos;re all caught up
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    No pending tasks are visible for your role.
                  </p>
                </div>
              )}
            </article>

            {/* -------------------------------------------------
                INVENTORY ATTENTION
            ------------------------------------------------- */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Inventory Attention
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Products at or below the stock threshold
                  </p>
                </div>

                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>

              {loading ? (
                <div className="space-y-5 p-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-3 w-32 rounded bg-slate-100" />

                      <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />

                      <div className="mt-4 h-1.5 w-full rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : dashboard?.lowStock.count === null ? (
                <div className="flex h-48 items-center justify-center px-5 text-center text-sm text-slate-400">
                  Inventory information is not available for your role.
                </div>
              ) : dashboard?.lowStock.items.length ? (
                <div className="divide-y divide-slate-100">
                  {dashboard.lowStock.items.slice(0, 5).map((item) => {
                    const percentage = Math.min(
                      100,
                      (item.quantity /
                        Math.max(dashboard.lowStock.threshold, 1)) *
                        100,
                    );

                    return (
                      <div
                        key={`${item.productId}-${item.sku}`}
                        className="px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.productName}
                            </p>

                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {item.sku}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-slate-900">
                              {item.quantity}
                            </p>

                            <p className="text-[11px] text-slate-400">left</p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-[11px] text-slate-400">
                          Threshold: {dashboard.lowStock.threshold} units
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center px-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Stock levels look good
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    No products are currently below the threshold.
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 p-4">
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                >
                  <Package className="h-4 w-4" />
                  View Inventory
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
