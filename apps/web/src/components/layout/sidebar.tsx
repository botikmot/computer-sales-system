"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: {
    label: string;
    href: string;
  }[];
};

const sections: {
  label: string;
  items: NavItem[];
}[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Inquiries",
        icon: ClipboardList,
        href: "/sales/inquiries",
      },
      {
        label: "Quotations",
        icon: FileText,
        href: "/sales/quotations",
      },
      {
        label: "Sales Orders",
        icon: ShoppingCart,
        href: "/sales/orders",
      },
      {
        label: "Invoices",
        icon: Receipt,
        href: "/sales/invoices",
      },
      {
        label: "Payments",
        icon: CreditCard,
        href: "/sales/payments",
      },
      {
        label: "Returns",
        icon: Truck,
        href: "/sales/returns",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Products",
        icon: Package,
        children: [
          {
            label: "All Products",
            href: "/products",
          },
          {
            label: "Categories",
            href: "/products/categories",
          },
        ],
      },
      {
        label: "Stock",
        icon: Boxes,
        href: "/stock",
      },
      {
        label: "Receiving",
        icon: Truck,
        href: "/receiving",
      },
      {
        label: "Assembly",
        icon: Settings,
        href: "/assembly",
      },
      {
        label: "Adjustments",
        icon: ClipboardList,
        href: "/adjustments",
      },
    ],
  },
  {
    label: "Purchasing",
    items: [
      {
        label: "Suppliers",
        icon: Users,
        href: "/suppliers",
      },
      {
        label: "Purchase Requests",
        icon: ClipboardList,
        href: "/purchase-requests",
      },
      {
        label: "Supplier Quotations",
        icon: FileText,
        href: "/supplier-quotations",
      },
      {
        label: "Purchase Orders",
        icon: ShoppingCart,
        href: "/purchase-orders",
      },
      {
        label: "Supplier Payments",
        icon: CreditCard,
        href: "/supplier-payments",
      },
    ],
  },
  {
    label: "Services",
    items: [
      {
        label: "Service Jobs",
        icon: Wrench,
        href: "/service-jobs",
      },
      {
        label: "Service Invoices",
        icon: Receipt,
        href: "/service-invoices",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Accounts Receivable",
        icon: UserRound,
        href: "/accounts-receivable",
      },
      {
        label: "Accounts Payable",
        icon: Building2,
        href: "/accounts-payable",
      },
      {
        label: "Cash & Bank",
        icon: CreditCard,
        href: "/cash-bank",
      },
      {
        label: "Petty Cash",
        icon: Receipt,
        href: "/petty-cash",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports Center",
        icon: BarChart3,
        href: "/reports",
      },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const [productsOpen, setProductsOpen] = useState(
    pathname.startsWith("/products"),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-5">
        <div className="min-w-0">
          <div className="truncate text-[20px] font-bold tracking-tight text-slate-950">
            Comp<span className="text-primary">Flow</span>
          </div>

          <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Business Operations
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children?.length);

                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href
                        ? pathname === item.href ||
                          pathname.startsWith(`${item.href}/`)
                        : false;

                  /*
                   * Products parent
                   */
                  if (hasChildren) {
                    const productsActive = pathname.startsWith("/products");

                    const allProductsActive =
                      pathname === "/products" ||
                      (pathname.startsWith("/products/") &&
                        !pathname.startsWith("/products/categories"));

                    const categoriesActive =
                      pathname === "/products/categories" ||
                      pathname.startsWith("/products/categories/");

                    return (
                      <div key={item.label}>
                        {/* Parent */}
                        <button
                          type="button"
                          onClick={() => setProductsOpen((value) => !value)}
                          aria-expanded={productsOpen}
                          className={[
                            "group relative flex min-h-10 w-full items-center gap-3 overflow-hidden rounded-xl px-3 text-left text-[13px] font-medium transition-all",
                            productsActive
                              ? "bg-blue-50 text-primary"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity",
                              productsActive
                                ? "bg-primary opacity-100"
                                : "opacity-0",
                            ].join(" ")}
                          />

                          <Icon
                            className={[
                              "h-[17px] w-[17px] shrink-0",
                              productsActive
                                ? "text-primary"
                                : "text-slate-400 group-hover:text-slate-600",
                            ].join(" ")}
                          />

                          <span className="min-w-0 flex-1 text-[13px] font-medium truncate">
                            {item.label}
                          </span>

                          <ChevronDown
                            className={[
                              "h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200",
                              productsOpen ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </button>

                        {/* Submenu */}
                        {productsOpen && (
                          <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                            {item.children?.map((child) => {
                              const childActive =
                                child.href === "/products"
                                  ? allProductsActive
                                  : categoriesActive;

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={onNavigate}
                                  className={[
                                    "group relative flex min-h-9 items-center rounded-lg px-3 text-[12px] font-medium transition-all",
                                    childActive
                                      ? "bg-blue-50 text-primary"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "mr-2 h-1.5 w-1.5 shrink-0 rounded-full",
                                      childActive
                                        ? "bg-primary"
                                        : "bg-slate-300 group-hover:bg-slate-400",
                                    ].join(" ")}
                                  />

                                  <span className="min-w-0 truncate">
                                    {child.label}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  /*
                   * Soon / disabled item
                   */
                  if (!item.href) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        disabled
                        className="group relative flex min-h-10 w-full cursor-not-allowed items-center gap-3 overflow-hidden rounded-xl px-3 text-left text-[13px] font-medium text-slate-400"
                      >
                        <Icon className="h-[17px] w-[17px] shrink-0 text-slate-300" />

                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>

                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Soon
                        </span>
                      </button>
                    );
                  }

                  /*
                   * Normal link
                   */
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onNavigate}
                      className={[
                        "group relative flex min-h-10 w-full items-center gap-3 overflow-hidden rounded-xl px-3 text-left text-[13px] font-medium transition-all",
                        active
                          ? "bg-blue-50 text-primary"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity",
                          active ? "bg-primary opacity-100" : "opacity-0",
                        ].join(" ")}
                      />

                      <Icon
                        className={[
                          "h-[17px] w-[17px] shrink-0",
                          active
                            ? "text-primary"
                            : "text-slate-400 group-hover:text-slate-600",
                        ].join(" ")}
                      />

                      <span className="min-w-0 truncate">{item.label}</span>

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User / Settings area */}
      <div className="shrink-0 border-t border-slate-200 p-3">
        <Link
          href="/settings"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
        >
          <Settings className="h-[17px] w-[17px] shrink-0 text-slate-400" />

          <span>Settings</span>

          <ChevronDown className="ml-auto h-4 w-4 text-slate-300" />
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] overflow-hidden border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[300px] overflow-hidden bg-white shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-5 z-10 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}
