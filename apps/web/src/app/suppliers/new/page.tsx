"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  createSupplier,
  type CreateSupplierPayload,
} from "@/features/purchasing/suppliers-api";

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

const labelClassName = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function NewSupplierPage() {
  const router = useRouter();

  const [form, setForm] = useState<CreateSupplierPayload>({
    code: "",
    name: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    address: "",
    taxId: "",
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof CreateSupplierPayload,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const code = form.code.trim();
    const name = form.name.trim();

    if (!code) {
      setError("Supplier code is required.");
      return;
    }

    if (!name) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setSaving(true);

      const payload: CreateSupplierPayload = {
        code,
        name,
        contactPerson: form.contactPerson?.trim() || undefined,
        contactNumber: form.contactNumber?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        taxId: form.taxId?.trim() || undefined,
        isActive: form.isActive,
      };

      await createSupplier(payload);

      router.push("/suppliers");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create supplier.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              New Supplier
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Add a supplier to your purchasing master data.
            </p>
          </div>

          <Link
            href="/suppliers"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </Link>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create supplier</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Supplier Information */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Supplier Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Basic identification details for this supplier.
                </p>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                  <label htmlFor="code" className={labelClassName}>
                    Supplier Code <span className="text-rose-500">*</span>
                  </label>

                  <input
                    id="code"
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      updateField("code", event.target.value)
                    }
                    placeholder="e.g. SUP-001"
                    maxLength={50}
                    disabled={saving}
                    className={inputClassName}
                  />

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Must be unique.
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className={labelClassName}>
                    Supplier Name <span className="text-rose-500">*</span>
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="e.g. ABC Computer Supplies"
                    maxLength={150}
                    disabled={saving}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Contact Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Supplier contact details for purchasing communication.
                </p>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div>
                  <label htmlFor="contactPerson" className={labelClassName}>
                    Contact Person
                  </label>

                  <input
                    id="contactPerson"
                    type="text"
                    value={form.contactPerson}
                    onChange={(event) =>
                      updateField("contactPerson", event.target.value)
                    }
                    placeholder="e.g. Juan Dela Cruz"
                    maxLength={150}
                    disabled={saving}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label htmlFor="contactNumber" className={labelClassName}>
                    Contact Number
                  </label>

                  <input
                    id="contactNumber"
                    type="text"
                    value={form.contactNumber}
                    onChange={(event) =>
                      updateField("contactNumber", event.target.value)
                    }
                    placeholder="e.g. 09170000000"
                    maxLength={50}
                    disabled={saving}
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="email" className={labelClassName}>
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="e.g. supplier@example.com"
                    maxLength={150}
                    disabled={saving}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            {/* Address & Tax */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Address & Tax
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Additional supplier information.
                </p>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="address" className={labelClassName}>
                    Address
                  </label>

                  <textarea
                    id="address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Supplier business address"
                    maxLength={255}
                    rows={3}
                    disabled={saving}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label htmlFor="taxId" className={labelClassName}>
                    Tax ID
                  </label>

                  <input
                    id="taxId"
                    type="text"
                    value={form.taxId}
                    onChange={(event) =>
                      updateField("taxId", event.target.value)
                    }
                    placeholder="Optional"
                    maxLength={100}
                    disabled={saving}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Status</h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Inactive suppliers remain in the system but cannot be treated
                  as active master data.
                </p>
              </div>

              <div className="p-5">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      updateField("isActive", event.target.checked)
                    }
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Active supplier
                    </span>

                    <span className="block text-xs text-slate-400">
                      Supplier is available for purchasing transactions.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/suppliers"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Supplier
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
