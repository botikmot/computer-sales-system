"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  createProduct,
  type CreateProductPayload,
} from "@/features/products/products-api";
import { ProductForm } from "@/features/products/product-form";

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(payload: CreateProductPayload) {
    setSubmitting(true);

    try {
      await createProduct(payload);
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
                  New Product
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create a product record for inventory and sales.
                </p>
              </div>
            </div>
          </div>
        </section>

        <ProductForm
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </AppShell>
  );
}
