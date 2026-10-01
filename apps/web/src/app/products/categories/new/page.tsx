"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  createProductCategory,
  type CreateCategoryPayload,
} from "@/features/products/categories-api";

export default function NewCategoryPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Category name is required.");
      return;
    }

    setLoading(true);
    setError("");

    const payload: CreateCategoryPayload = {
      name: normalizedName,
      isActive,
    };

    try {
      await createProductCategory(payload);
      router.replace("/products/categories");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create category.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <section>
          <Link
            href="/products/categories"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>

          <div className="mt-5">
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Category
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create a category for organizing products.
            </p>
          </div>
        </section>

        <section className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-950">
              Category Information
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Enter the category name and status.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Category Name
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Memory, Processors, Accessories"
                disabled={loading}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => setIsActive((current) => !current)}
              className={[
                "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                isActive
                  ? "border-primary/20 bg-primary/5"
                  : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  Active Category
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Active categories can be assigned to products.
                </p>
              </div>

              <span
                className={[
                  "relative inline-flex h-6 w-11 rounded-full transition",
                  isActive ? "bg-primary" : "bg-slate-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                    isActive ? "left-6" : "left-1",
                  ].join(" ")}
                />
              </span>
            </button>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => router.back()}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Category
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
