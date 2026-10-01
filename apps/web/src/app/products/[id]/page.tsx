"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  getProduct,
  updateProduct,
  type Product,
  type CreateProductPayload,
} from "@/features/products/products-api";
import { ProductForm } from "@/features/products/product-form";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const result = await getProduct(params.id);

        if (!cancelled) {
          setProduct(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load product.",
          );
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleSubmit(payload: CreateProductPayload) {
    setSubmitting(true);

    try {
      await updateProduct(params.id, payload);
      router.replace("/products");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <section>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>

          <div className="mt-5">
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Edit Product
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Update the product master record.
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading product...
            </div>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <p className="font-semibold">Unable to load product</p>

            <p className="mt-1">{error}</p>
          </section>
        ) : product ? (
          <ProductForm
            product={product}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
