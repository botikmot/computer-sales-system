"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  CircleUserRound,
  Factory,
  LockKeyhole,
  Package,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

type UserRole =
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "PURCHASING"
  | "INVENTORY"
  | "TECHNICIAN"
  | "CASHIER";

type SettingsItemKey =
  | "branches"
  | "users"
  | "customers"
  | "suppliers"
  | "productCategories"
  | "products"
  | "cashBankAccounts"
  | "rolesPermissions"
  | "account";

type SettingsItemProps = {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  available?: boolean;
};

type SettingsItemConfig = SettingsItemProps & {
  key: SettingsItemKey;
  roles: readonly UserRole[];
};

type SettingsSectionConfig = {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  iconClassName: string;
  gridClassName: string;
  items: SettingsItemConfig[];
};

const ALL_ROLES: readonly UserRole[] = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "PURCHASING",
  "INVENTORY",
  "TECHNICIAN",
  "CASHIER",
];

const ADMIN_MANAGER: readonly UserRole[] = ["ADMIN", "MANAGER"];
const ADMIN_ONLY: readonly UserRole[] = ["ADMIN"];

function getStoredUserRole(): UserRole | "" {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawUser = window.localStorage.getItem("compflow_user");

    if (!rawUser) {
      return "";
    }

    const parsed: unknown = JSON.parse(rawUser);

    if (!parsed || typeof parsed !== "object") {
      return "";
    }

    const record = parsed as {
      role?: unknown;
      user?: { role?: unknown };
    };

    const candidate =
      typeof record.role === "string"
        ? record.role
        : typeof record.user?.role === "string"
          ? record.user.role
          : "";

    return ALL_ROLES.includes(candidate as UserRole)
      ? (candidate as UserRole)
      : "";
  } catch {
    return "";
  }
}

function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("compflow-auth-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("compflow-auth-change", callback);
  };
}

function SettingsItem({
  icon,
  title,
  description,
  href,
  available = false,
}: SettingsItemProps) {
  const content = (
    <div
      className={[
        "flex items-center gap-4 rounded-2xl border bg-white p-5",
        "transition",
        available
          ? "border-slate-200 hover:border-primary/30 hover:shadow-sm"
          : "border-slate-100 opacity-70",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          available
            ? "bg-primary/10 text-primary"
            : "bg-slate-100 text-slate-400",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

          {!available && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Coming next
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      {available && (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-slate-300"
        />
      )}
    </div>
  );

  if (!available || !href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    key: "organization",
    title: "Organization",
    description: "Manage branches and system users.",
    icon: <Building2 className="h-4 w-4" />,
    iconClassName: "bg-blue-50 text-blue-600",
    gridClassName: "grid gap-4 md:grid-cols-2",
    items: [
      {
        key: "branches",
        icon: <Building2 className="h-5 w-5" />,
        title: "Branches",
        description:
          "Create and manage company branches, contact information, and branch status.",
        href: "/settings/branches",
        available: true,
        roles: ADMIN_MANAGER,
      },
      {
        key: "users",
        icon: <UsersRound className="h-5 w-5" />,
        title: "Users",
        description:
          "Create users and manage roles, branch assignments, and account status.",
        href: "/settings/users",
        available: true,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    key: "master-data",
    title: "Master Data",
    description:
      "Core records used throughout sales, purchasing, inventory, and services.",
    icon: <Package className="h-4 w-4" />,
    iconClassName: "bg-emerald-50 text-emerald-600",
    gridClassName: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
    items: [
      {
        key: "customers",
        icon: <CircleUserRound className="h-5 w-5" />,
        title: "Customers",
        description: "Manage customers used by sales and accounts receivable.",
        href: "/settings/customers",
        available: true,
        roles: ADMIN_MANAGER,
      },
      {
        key: "suppliers",
        icon: <Factory className="h-5 w-5" />,
        title: "Suppliers",
        description:
          "Manage suppliers used by purchasing and accounts payable.",
        href: "/suppliers",
        available: true,
        roles: ADMIN_MANAGER,
      },
      {
        key: "productCategories",
        icon: <Package className="h-5 w-5" />,
        title: "Product Categories",
        description: "Organize products into manageable categories.",
        href: "/products/categories",
        available: true,
        roles: ADMIN_MANAGER,
      },
      {
        key: "products",
        icon: <ShoppingBag className="h-5 w-5" />,
        title: "Products",
        description:
          "Manage product master data, pricing, and inventory settings.",
        href: "/products",
        available: true,
        roles: ADMIN_MANAGER,
      },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    description:
      "Manage financial accounts used for cash, bank, and payment transactions.",
    icon: <WalletCards className="h-4 w-4" />,
    iconClassName: "bg-cyan-50 text-cyan-600",
    gridClassName: "grid gap-4 md:grid-cols-2",
    items: [
      {
        key: "cashBankAccounts",
        icon: <WalletCards className="h-5 w-5" />,
        title: "Cash & Bank Accounts",
        description:
          "Create and manage the cash and bank accounts used for payments and financial transactions.",
        href: "/cash-bank",
        available: true,
        roles: ADMIN_MANAGER,
      },
    ],
  },
  {
    key: "security",
    title: "Security",
    description: "Access control and account-related configuration.",
    icon: <ShieldCheck className="h-4 w-4" />,
    iconClassName: "bg-violet-50 text-violet-600",
    gridClassName: "grid gap-4 md:grid-cols-2",
    items: [
      {
        key: "rolesPermissions",
        icon: <LockKeyhole className="h-5 w-5" />,
        title: "Roles & Permissions",
        description: "Review and manage system access by role.",
        href: "/settings/roles-permissions",
        available: true,
        roles: ADMIN_ONLY,
      },
      {
        key: "account",
        icon: <Settings2 className="h-5 w-5" />,
        title: "Account",
        description: "Manage your account and personal settings.",
        href: "/settings/account",
        available: true,
        roles: ALL_ROLES,
      },
    ],
  },
];

export default function SettingsPage() {
  const userRole = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredUserRole,
    () => "",
  );

  const visibleSections = SETTINGS_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.roles.includes(userRole as UserRole),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-primary">
            System Configuration
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Settings
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage your organization, users, master data, and system
            configuration.
          </p>
        </div>

        {userRole === "" ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
            role="status"
          >
            Loading settings available for your role...
          </div>
        ) : visibleSections.length > 0 ? (
          visibleSections.map((section) => (
            <section key={section.key}>
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${section.iconClassName}`}
                >
                  {section.icon}
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {section.title}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className={section.gridClassName}>
                {section.items.map((item) => (
                  <SettingsItem
                    key={item.key}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    href={item.href}
                    available={item.available}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            No system configuration options are assigned to your role. Use the
            main navigation to access your operational modules.
          </div>
        )}
      </div>
    </AppShell>
  );
}
