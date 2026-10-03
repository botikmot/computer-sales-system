import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";

type Money = string | number;

type ListResult<T> =
  | T[]
  | {
      items: T[];
      pagination?: unknown;
    }
  | {
      data: T[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

function getListItems<T>(result: ListResult<T>): T[] {
  if (Array.isArray(result)) {
    return result;
  }

  if ("items" in result) {
    return result.items;
  }

  return result.data;
}

type SalesInvoiceSummary = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  total: Money;
  amountPaid: Money;
  balanceDue: Money;
  status: string;
  customer?: {
    id: string;
    name?: string | null;
    businessName?: string | null;
  } | null;
};

type MonthlySalesResponse = {
  year: number;
  month: number;
  from: string;
  to: string;
  count: number;
  totalSales: Money;
  amountPaid: Money;
  balanceDue: Money;
  invoices: SalesInvoiceSummary[];
};

type SalesOrderSummary = {
  id: string;
  status: string;
  orderNo?: string;
  total?: Money;
  createdAt?: string;
  customer?: {
    id: string;
    name?: string | null;
    businessName?: string | null;
  } | null;
};

type CustomerBalanceResponse = {
  count: number;
  customers: Array<{
    customer: {
      id: string;
      name?: string | null;
      businessName?: string | null;
    };
    invoiceCount: number;
    originalAmount: Money;
    amountPaid: Money;
    balanceDue: Money;
  }>;
};

type LowStockResponse = {
  threshold: number;
  count: number;
  items: Array<{
    branchId: string;
    productId: string;
    sku: string;
    productName: string;
    category: string | null;
    quantity: number;
    averageCost: Money;
    inventoryValue: Money;
  }>;
};

type OutstandingPurchaseResponse = {
  from: string | null;
  to: string | null;
  count: number;
  outstandingTotal: Money;
  purchaseOrders: unknown[];
};

type OpenServiceJobsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  jobs: unknown[];
};

export type DashboardWeeklySale = {
  key: string;
  label: string;
  value: number;
};

export type DashboardTransaction = {
  reference: string;
  customer: string;
  type: "Sales Invoice";
  amount: number;
  status: "PAID" | "DUE";
  date: string;
};

export type DashboardData = {
  sales: {
    todayTotal: number | null;
    todayTransactions: number | null;
    weekly: DashboardWeeklySale[];
  };
  orders: {
    open: number | null;
    readyForRelease: number | null;
  };
  receivables: {
    totalBalance: number | null;
    outstandingAccounts: number | null;
  };
  lowStock: {
    count: number | null;
    threshold: number;
    items: LowStockResponse["items"];
  };
  purchasing: {
    toReceive: number | null;
  };
  service: {
    inProgress: number | null;
  };
  transactions: DashboardTransaction[];
};

function toNumber(value: Money | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getWeekDates(today: Date) {
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  const day = current.getDay();

  // Monday = first day of the dashboard week.
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = addDays(current, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function getCustomerName(
  customer:
    | {
        name?: string | null;
        businessName?: string | null;
      }
    | null
    | undefined,
): string {
  return (
    customer?.businessName?.trim() ||
    customer?.name?.trim() ||
    "Walk-in Customer"
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const role = user.role;

  const canViewSales =
    role === "ADMIN" || role === "MANAGER" || role === "SALES";

  const canViewOrders =
    role === "ADMIN" || role === "MANAGER" || role === "SALES";

  const canViewReceivables =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "SALES" ||
    role === "CASHIER";

  const canViewInventory =
    role === "ADMIN" || role === "MANAGER" || role === "INVENTORY";

  const canViewPurchasing =
    role === "ADMIN" || role === "MANAGER" || role === "PURCHASING";

  const canViewService =
    role === "ADMIN" || role === "MANAGER" || role === "TECHNICIAN";

  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const todayKey = getLocalDateKey(today);

  const [
    monthlySales,
    salesOrdersResult,
    customerBalances,
    lowStock,
    outstandingPurchases,
    openServiceJobs,
    salesInvoicesResult,
  ] = await Promise.all([
    canViewSales
      ? apiFetch<MonthlySalesResponse>(
          `/reports/sales/monthly?year=${year}&month=${month}`,
        )
      : Promise.resolve(null),

    canViewOrders
      ? apiFetch<ListResult<SalesOrderSummary>>("/sales/orders?limit=100")
      : Promise.resolve(null),

    canViewReceivables
      ? apiFetch<CustomerBalanceResponse>(
          "/reports/accounts-receivable/customer-balances",
        )
      : Promise.resolve(null),

    canViewInventory
      ? apiFetch<LowStockResponse>("/reports/inventory/low-stock?threshold=5")
      : Promise.resolve(null),

    canViewPurchasing
      ? apiFetch<OutstandingPurchaseResponse>("/reports/purchasing/outstanding")
      : Promise.resolve(null),

    canViewService
      ? apiFetch<OpenServiceJobsResponse>("/reports/service/open-jobs")
      : Promise.resolve(null),

    canViewSales
      ? apiFetch<ListResult<SalesInvoiceSummary>>("/sales/invoices?limit=100")
      : Promise.resolve(null),
  ]);

  const salesOrders =
    salesOrdersResult === null ? null : getListItems(salesOrdersResult);

  const salesInvoices =
    salesInvoicesResult === null ? null : getListItems(salesInvoicesResult);

  const invoices = monthlySales?.invoices ?? [];

  const todayInvoices = invoices.filter(
    (invoice) => getLocalDateKey(new Date(invoice.invoiceDate)) === todayKey,
  );

  const todaySales = todayInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.total),
    0,
  );

  const weeklyDates = getWeekDates(today);

  const weeklySales = weeklyDates.map((date) => {
    const key = getLocalDateKey(date);

    const value = invoices
      .filter(
        (invoice) => getLocalDateKey(new Date(invoice.invoiceDate)) === key,
      )
      .reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

    return {
      key,
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      value,
    };
  });

  const openOrders =
    salesOrders?.filter(
      (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
    ).length ?? null;

  const readyForRelease =
    salesOrders?.filter((order) => order.status === "CONFIRMED").length ?? null;

  const totalReceivable =
    customerBalances?.customers.reduce(
      (sum, customer) => sum + toNumber(customer.balanceDue),
      0,
    ) ?? null;

  const outstandingAccounts =
    customerBalances?.customers.filter(
      (customer) => toNumber(customer.balanceDue) > 0,
    ).length ?? null;

  const recentTransactions =
    salesInvoices
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
      )
      .slice(0, 5)
      .map((invoice) => ({
        reference: invoice.invoiceNo,
        customer: getCustomerName(invoice.customer),
        type: "Sales Invoice" as const,
        amount: toNumber(invoice.total),
        status:
          toNumber(invoice.balanceDue) <= 0
            ? ("PAID" as const)
            : ("DUE" as const),
        date: invoice.invoiceDate,
      })) ?? [];

  return {
    sales: {
      todayTotal: canViewSales ? todaySales : null,
      todayTransactions: canViewSales ? todayInvoices.length : null,
      weekly: weeklySales,
    },

    orders: {
      open: openOrders,
      readyForRelease,
    },

    receivables: {
      totalBalance: totalReceivable,
      outstandingAccounts,
    },

    lowStock: {
      count: lowStock?.count ?? null,
      threshold: lowStock?.threshold ?? 5,
      items: lowStock?.items ?? [],
    },

    purchasing: {
      toReceive: outstandingPurchases?.count ?? null,
    },

    service: {
      inProgress: openServiceJobs?.count ?? null,
    },

    transactions: recentTransactions,
  };
}
