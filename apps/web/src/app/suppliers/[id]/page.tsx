"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSupplier,
  updateSupplier,
  type Supplier,
  type UpdateSupplierPayload,
} from "@/features/purchasing/suppliers-api";

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

const textareaClassName =
  "min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition",
        checked
          ? "border-primary/20 bg-primary/5"
          : "border-slate-200 bg-slate-50/60",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/30",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">{title}</p>

          <span
            className={[
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
              checked ? "bg-primary" : "bg-slate-300",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                checked ? "left-6" : "left-1",
              ].join(" ")}
            />
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
    </button>
  );
}

function SupplierForm({
  supplier,
  submitting,
  onSubmit,
  onCancel,
}: {
  supplier: Supplier;
  submitting: boolean;
  onSubmit: (payload: UpdateSupplierPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(supplier.code);
  const [name, setName] = useState(supplier.name);
  const [contactPerson, setContactPerson] = useState(
    supplier.contactPerson ?? "",
  );
  const [contactNumber, setContactNumber] = useState(
    supplier.contactNumber ?? "",
  );
  const [email, setEmail] = useState(supplier.email ?? "");
  const [address, setAddress] = useState(supplier.address ?? "");
  const [taxId, setTaxId] = useState(supplier.taxId ?? "");
  const [isActive, setIsActive] = useState(supplier.isActive);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const normalizedCode = code.trim();
    const normalizedName = name.trim();

    if (!normalizedCode) {
      setError("Supplier code is required.");
      return;
    }

    if (!normalizedName) {
      setError("Supplier name is required.");
      return;
    }

    try {
      await onSubmit({
        code: normalizedCode,
        name: normalizedName,
        contactPerson: contactPerson.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        isActive,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update supplier.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div>
            <p className="font-semibold">Unable to save supplier</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Supplier Information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">
              Supplier Information
            </h2>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Basic supplier identification details.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Supplier Code" required>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={50}
              disabled={submitting}
              className={inputClassName}
            />
          </Field>

          <Field label="Supplier Name" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={150}
              disabled={submitting}
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Contact Information</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Supplier contact details.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Contact Person">
            <input
              value={contactPerson}
              onChange={(event) => setContactPerson(event.target.value)}
              maxLength={150}
              disabled={submitting}
              className={inputClassName}
            />
          </Field>

          <Field label="Contact Number">
            <input
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              maxLength={50}
              disabled={submitting}
              className={inputClassName}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={150}
                disabled={submitting}
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Address & Tax */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Address & Tax</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Additional supplier information.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Address">
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={255}
                rows={3}
                disabled={submitting}
                className={textareaClassName}
              />
            </Field>
          </div>

          <Field label="Tax ID">
            <input
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              maxLength={100}
              disabled={submitting}
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      {/* Status */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Status</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Control whether this supplier remains active.
          </p>
        </div>

        <div className="p-5">
          <ToggleCard
            title="Active Supplier"
            description="Allow this supplier to remain available for purchasing transactions."
            checked={isActive}
            onChange={setIsActive}
            disabled={submitting}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSupplier() {
      try {
        const result = await getSupplier(params.id);

        if (cancelled) {
          return;
        }

        setSupplier(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load supplier.",
        );
        setLoading(false);
      }
    }

    void loadSupplier();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleSubmit(payload: UpdateSupplierPayload) {
    setSubmitting(true);

    try {
      await updateSupplier(params.id, payload);
      router.replace("/suppliers");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <section>
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </Link>

          <div className="mt-5">
            <p className="text-sm font-semibold text-primary">Purchasing</p>

            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Edit Supplier
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Update the supplier master record.
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading supplier...
            </div>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <p className="font-semibold">Unable to load supplier</p>
            <p className="mt-1">{error}</p>
          </section>
        ) : supplier ? (
          <SupplierForm
            supplier={supplier}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
