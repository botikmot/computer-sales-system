import Link from "next/link";
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
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

type SettingsItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  available?: boolean;
};

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
        <div className="flex items-center gap-2">
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
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  );

  if (!available || !href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default function SettingsPage() {
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

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Organization
              </h2>

              <p className="text-xs text-slate-500">
                Manage branches and system users.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingsItem
              icon={<Building2 className="h-5 w-5" />}
              title="Branches"
              description="Create and manage company branches, contact information, and branch status."
              href="/settings/branches"
              available
            />

            <SettingsItem
              icon={<UsersRound className="h-5 w-5" />}
              title="Users"
              description="Create users and manage roles, branch assignments, and account status."
              href="/settings/users"
              available
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Package className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Master Data
              </h2>

              <p className="text-xs text-slate-500">
                Core records used throughout sales, purchasing, inventory, and
                services.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SettingsItem
              icon={<CircleUserRound className="h-5 w-5" />}
              title="Customers"
              description="Manage customers used by sales and accounts receivable."
              href="/settings/customers"
              available
            />

            <SettingsItem
              icon={<Factory className="h-5 w-5" />}
              title="Suppliers"
              description="Manage suppliers used by purchasing and accounts payable."
              href="/suppliers"
              available
            />

            <SettingsItem
              icon={<Package className="h-5 w-5" />}
              title="Product Categories"
              description="Organize products into manageable categories."
              href="/products/categories"
              available
            />

            <SettingsItem
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Products"
              description="Manage product master data, pricing, and inventory settings."
              href="/products"
              available
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Security
              </h2>

              <p className="text-xs text-slate-500">
                Access control and account-related configuration.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingsItem
              icon={<LockKeyhole className="h-5 w-5" />}
              title="Roles & Permissions"
              description="Review and manage system access by role."
            />

            <SettingsItem
              icon={<Settings2 className="h-5 w-5" />}
              title="Account"
              description="Manage your account and personal settings."
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
