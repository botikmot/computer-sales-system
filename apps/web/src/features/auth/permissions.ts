import type { UserRole } from "./auth-api";

export type Permission =
  | "dashboard"
  | "sales.inquiries"
  | "sales.quotations"
  | "sales.orders"
  | "sales.invoices"
  | "sales.payments"
  | "sales.returns"
  | "inventory.products"
  | "inventory.stock"
  | "inventory.receiving"
  | "inventory.assembly"
  | "inventory.adjustments"
  | "purchasing.suppliers"
  | "purchasing.requests"
  | "purchasing.quotations"
  | "purchasing.orders"
  | "purchasing.invoices"
  | "purchasing.payments"
  | "services.jobs"
  | "services.invoices"
  | "finance.ar"
  | "finance.ap"
  | "finance.cash-bank"
  | "finance.petty-cash"
  | "reports"
  | "settings";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard",

    "sales.inquiries",
    "sales.quotations",
    "sales.orders",
    "sales.invoices",
    "sales.payments",
    "sales.returns",

    "inventory.products",
    "inventory.stock",
    "inventory.receiving",
    "inventory.assembly",
    "inventory.adjustments",

    "purchasing.suppliers",
    "purchasing.requests",
    "purchasing.quotations",
    "purchasing.orders",
    "purchasing.invoices",
    "purchasing.payments",

    "services.jobs",
    "services.invoices",

    "finance.ar",
    "finance.ap",
    "finance.cash-bank",
    "finance.petty-cash",

    "reports",
    "settings",
  ],

  MANAGER: [
    "dashboard",

    "sales.inquiries",
    "sales.quotations",
    "sales.orders",
    "sales.invoices",
    "sales.payments",
    "sales.returns",

    "inventory.products",
    "inventory.stock",
    "inventory.receiving",
    "inventory.assembly",
    "inventory.adjustments",

    "purchasing.suppliers",
    "purchasing.requests",
    "purchasing.quotations",
    "purchasing.orders",
    "purchasing.invoices",
    "purchasing.payments",

    "services.jobs",
    "services.invoices",

    "finance.ar",
    "finance.ap",
    "finance.cash-bank",
    "finance.petty-cash",

    "reports",
    "settings",
  ],

  SALES: [
    "dashboard",

    "sales.inquiries",
    "sales.quotations",
    "sales.orders",
    "sales.invoices",
    "sales.payments",
    "sales.returns",

    "services.invoices",
  ],

  PURCHASING: [
    "dashboard",

    "purchasing.suppliers",
    "purchasing.requests",
    "purchasing.quotations",
    "purchasing.orders",
    "purchasing.invoices",
    "purchasing.payments",

    "inventory.receiving",
  ],

  INVENTORY: [
    "dashboard",

    "inventory.products",
    "inventory.stock",
    "inventory.receiving",
    "inventory.assembly",
    "inventory.adjustments",
  ],

  TECHNICIAN: ["dashboard", "services.jobs", "services.invoices"],

  CASHIER: [
    "dashboard",

    "sales.invoices",
    "sales.payments",

    "finance.ar",
    "finance.cash-bank",
    "finance.petty-cash",
  ],
};

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
