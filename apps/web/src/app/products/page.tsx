"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Plus,
  Search,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getProducts, type Product } from "@/features/products/products-api";

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const result = await getProducts({
        search: search.trim() || undefined,
        isActive:
          activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
      });

      setProducts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search, activeFilter]);

  const summary = useMemo(() => {
    const active = products.filter((item) => item.isActive).length;
    const inactive = products.filter((item) => !item.isActive).length;
    const tracked = products.filter((item) => item.trackInventory).length;

    return {
      total: products.length,
      active,
      inactive,
      tracked,
    };
  }, [products]);

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Products
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage product master data, pricing, categories, and inventory
              tracking settings.
            </p>
          </div>

          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Products"
            value={summary.total}
            icon={<Package className="h-5 w-5" />}
          />

          <SummaryCard
            label="Active"
            value={summary.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />

          <SummaryCard
            label="Inactive"
            value={summary.inactive}
            icon={<XCircle className="h-5 w-5" />}
          />

          <SummaryCard
            label="Inventory Tracked"
            value={summary.tracked}
            icon={<Boxes className="h-5 w-5" />}
          />
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load products</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Product Records
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Search products by SKU, name, brand, or model.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                  }}
                  placeholder="Search products..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { value: "ALL", label: "All" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ].map((option) => {
                  const selected = activeFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setActiveFilter(option.value as typeof activeFilter);
                      }}
                      className={[
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                        selected
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading products...
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No products found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Try a different search or create a new product.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Product</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader align="right">Selling Price</TableHeader>
                    <TableHeader align="right">Cost Price</TableHeader>
                    <TableHeader>Inventory</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="right">Action</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {product.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-48">
                          <p className="text-sm font-semibold text-slate-900">
                            {product.name}
                          </p>

                          {(product.brand || product.model) && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {[product.brand, product.model]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {product.category ? (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {product.unit || "pcs"}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-800">
                        {formatCurrency(product.defaultSellingPrice)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {formatCurrency(product.defaultCostPrice)}
                      </td>

                      <td className="px-5 py-4">
                        {product.trackInventory ? (
                          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Tracked
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Not tracked
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                            product.isActive,
                          )}`}
                        >
                          {product.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/20 hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
              <p className="text-xs text-slate-400">
                Showing {products.length} product
                {products.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
