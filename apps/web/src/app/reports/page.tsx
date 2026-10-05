"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  Calculator,
  ClipboardList,
  CreditCard,
  FileBarChart,
  PackageSearch,
  Receipt,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

type ReportGroup = {
  key: string;
  label: string;
  description: string;
  count: number;
  icon: typeof BarChart3;
  iconClass: string;
  reports: string[];
};

const reportGroups: ReportGroup[] = [
  {
    key: "purchasing",
    label: "Purchasing",
    description: "Purchase orders, supplier purchases, and outstanding orders.",
    count: 4,
    icon: ShoppingCart,
    iconClass: "bg-blue-50 text-blue-600",
    reports: [
      "Purchase Order Report",
      "Purchases by Supplier",
      "Purchases by Date",
      "Outstanding Purchase Orders",
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Stock levels, valuation, movements, and adjustments.",
    count: 6,
    icon: Boxes,
    iconClass: "bg-violet-50 text-violet-600",
    reports: [
      "Inventory Stock Report",
      "Stock Card",
      "Inventory Valuation",
      "Low Stock Report",
      "Inventory Movement",
      "Physical Count / Adjustment Report",
    ],
  },
  {
    key: "sales",
    label: "Sales",
    description: "Sales performance, customers, products, and returns.",
    count: 6,
    icon: Receipt,
    iconClass: "bg-emerald-50 text-emerald-600",
    reports: [
      "Daily Sales",
      "Monthly Sales",
      "Sales by Customer",
      "Sales by Product",
      "Sales by Salesperson",
      "Sales Returns",
    ],
  },
  {
    key: "service",
    label: "Service / Repair",
    description: "Repair workload, parts usage, revenue, and technicians.",
    count: 6,
    icon: Wrench,
    iconClass: "bg-amber-50 text-amber-600",
    reports: [
      "Open Job Orders",
      "Completed Repairs",
      "Pending Repairs",
      "Parts Used",
      "Service Revenue",
      "Technician Performance / Job Summary",
    ],
  },
  {
    key: "accounts-payable",
    label: "Accounts Payable",
    description: "Supplier balances, payables, due dates, and payments.",
    count: 4,
    icon: CreditCard,
    iconClass: "bg-rose-50 text-rose-600",
    reports: [
      "Supplier Balances",
      "Outstanding Payables",
      "Due / Overdue Payables",
      "Payment History",
    ],
  },
  {
    key: "accounts-receivable",
    label: "Accounts Receivable",
    description: "Customer balances, collections, and receivable aging.",
    count: 4,
    icon: Calculator,
    iconClass: "bg-cyan-50 text-cyan-600",
    reports: [
      "Customer Balances",
      "Outstanding Receivables",
      "Aging of Receivables",
      "Collection Report",
    ],
  },
  {
    key: "cash-bank",
    label: "Cash / Bank",
    description: "Cash activity, bank transactions, and reconciliation.",
    count: 5,
    icon: Banknote,
    iconClass: "bg-indigo-50 text-indigo-600",
    reports: [
      "Daily Cash Report",
      "Cash Receipts",
      "Cash Disbursements",
      "Bank Transactions",
      "Bank Reconciliation",
    ],
  },
  {
    key: "petty-cash",
    label: "Petty Cash",
    description: "Petty cash transactions, vouchers, and replenishments.",
    count: 4,
    icon: ClipboardList,
    iconClass: "bg-orange-50 text-orange-600",
    reports: [
      "Petty Cash Transactions",
      "Petty Cash Vouchers",
      "Replenishment Report",
      "Petty Cash Balance",
    ],
  },
  {
    key: "management",
    label: "Management / Financial",
    description: "Financial statements, profitability, cash flow, and aging.",
    count: 6,
    icon: BriefcaseBusiness,
    iconClass: "bg-slate-100 text-slate-700",
    reports: [
      "Income Statement",
      "Balance Sheet",
      "Cash Flow Report",
      "Sales and Profitability Report",
      "Inventory Valuation",
      "A/R and A/P Aging",
    ],
  },
];

const totalReports = reportGroups.reduce(
  (total, group) => total + group.count,
  0,
);

function getSelectedReport(
  value: string | null,
): { group: ReportGroup; report: string } | null {
  if (!value) {
    return null;
  }

  for (const group of reportGroups) {
    const reportIndex = group.reports.findIndex(
      (report) => report.toLowerCase().replace(/[^a-z0-9]+/g, "-") === value,
    );

    if (reportIndex >= 0) {
      return {
        group,
        report: group.reports[reportIndex],
      };
    }
  }

  return null;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const selectedGroup = searchParams.get("group");
  const selectedReport = searchParams.get("report");

  const selected = getSelectedReport(selectedReport);

  const REPORT_ROUTES: Record<string, Record<string, string>> = {
    sales: {
      "Daily Sales": "/reports/sales/daily",
      "Monthly Sales": "/reports/sales/monthly",
      "Sales by Customer": "/reports/sales/by-customer",
      "Sales by Product": "/reports/sales/by-product",
      "Sales by Salesperson": "/reports/sales/by-salesperson",
      "Sales Returns": "/reports/sales/returns",
    },

    purchasing: {
      "Purchase Order Report": "/reports/purchasing/purchase-orders",
      "Purchases by Supplier": "/reports/purchasing/by-supplier",
      "Purchases by Date": "/reports/purchasing/by-date",
      "Outstanding Purchase Orders": "/reports/purchasing/outstanding",
    },

    inventory: {
      "Inventory Stock Report": "/reports/inventory/stock",
      "Stock Card": "/reports/inventory/stock-card",
      "Inventory Valuation": "/reports/inventory/valuation",
      "Low Stock Report": "/reports/inventory/low-stock",
      "Inventory Movement": "/reports/inventory/movement",
      "Physical Count / Adjustment Report": "/reports/inventory/adjustments",
    },
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileBarChart className="h-4 w-4" />
              Reports Center
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Business Reports
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Access operational, financial, inventory, sales, purchasing,
              service, and cash reports from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <BarChart3 className="h-4 w-4 text-slate-400" />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Available Reports
              </p>

              <p className="text-sm font-bold text-slate-900">
                {totalReports} reports
              </p>
            </div>
          </div>
        </div>

        {/* Selected report */}
        {selected && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Selected Report
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {selected.report}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selected.group.label}
                </p>
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500">
                Report configuration will appear here
              </div>
            </div>
          </div>
        )}

        {/* Report categories */}
        <div>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Report Categories
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Choose a category to access its available reports.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportGroups.map((group) => {
              const Icon = group.icon;
              const isSelected = selectedGroup === group.key;

              return (
                <div
                  key={group.key}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                    isSelected
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${group.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {group.count} reports
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-950">
                    {group.label}
                  </h3>

                  <p className="mt-1 min-h-[40px] text-sm leading-5 text-slate-500">
                    {group.description}
                  </p>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="space-y-2">
                      {group.reports.map((report) => {
                        const reportKey = report
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-");

                        const href =
                          REPORT_ROUTES[group.key]?.[report] ??
                          `/reports?group=${group.key}&report=${reportKey}`;

                        return (
                          <Link
                            key={report}
                            href={href}
                            className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span>{report}</span>

                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <p className="text-sm leading-6 text-slate-500">
            Reports use the business data already recorded in the system.
            Filters, report generation, and detailed result views will be
            connected to the Reports API in the next step.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
