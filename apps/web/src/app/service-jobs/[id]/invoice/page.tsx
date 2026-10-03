"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  Save,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

import {
  getServiceJob,
  type ServiceJob,
} from "@/features/service-repair/service-jobs-api";

import {
  createServiceInvoiceFromJob,
  type ServicePaymentMode,
} from "@/features/service-repair/service-invoices-api";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function GenerateServiceInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<ServiceJob | null>(null);

  const [paymentMode, setPaymentMode] = useState<ServicePaymentMode>("CASH");

  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const jobId = params.id;

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function loadJob() {
      try {
        const result = await getServiceJob(jobId);

        if (cancelled) return;

        setJob(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Unable to load service job.",
        );
        setLoading(false);
      }
    }

    void loadJob();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!job) return;

    setSubmitError("");

    if (job.status !== "COMPLETED") {
      setSubmitError("Only completed service jobs can be invoiced.");
      return;
    }

    if (job.invoice) {
      setSubmitError("This service job already has a service invoice.");
      return;
    }

    try {
      setSubmitting(true);

      const invoice = await createServiceInvoiceFromJob(job.id, {
        paymentMode,
        dueDate: dueDate
          ? new Date(`${dueDate}T00:00:00`).toISOString()
          : undefined,
        notes: notes.trim() || undefined,
      });

      router.push(`/service-invoices/${invoice.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to generate service invoice.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="px-6 py-8">
          <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading service job...
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Unable to load service job
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {error || "Service job was not found."}
                </p>

                <Link
                  href="/service-jobs"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Service Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const partsTotal = job.parts.reduce(
    (sum, part) => sum + Number(part.totalCost || 0),
    0,
  );

  const estimatedTotal = Number(job.laborCharge || 0) + partsTotal;

  return (
    <AppShell>
      <div className="">
        <div className="">
          <div className="mb-6">
            <Link
              href={`/service-jobs/${job.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Service Job
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-primary">Services</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Generate Service Invoice
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Generate the customer invoice from this completed service job.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5" />

              <div>
                <p className="font-semibold">Unable to generate invoice</p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5" />

              <div>
                <p className="font-semibold">Invoice generation failed</p>

                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ReceiptText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Service Job
                  </h2>

                  <p className="text-sm text-slate-500">Invoice source</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Job No.
                  </p>

                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                    {job.jobNo}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Customer
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {job.customer.name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    COMPLETED
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Estimated Total
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatCurrency(estimatedTotal)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Invoice Details
                  </h2>

                  <p className="text-sm text-slate-500">
                    Select payment terms for this invoice.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Payment Mode
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("CASH")}
                      disabled={submitting}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        paymentMode === "CASH"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      CASH
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode("CREDIT")}
                      disabled={submitting}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        paymentMode === "CREDIT"
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      CREDIT
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Due Date
                  </span>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={submitting}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Recommended for credit invoices.
                  </p>
                </label>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </span>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  disabled={submitting}
                  placeholder="Optional invoice notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {notes.length}/1000
                </p>
              </label>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Invoice will be generated from the completed job
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Labor and all issued repair parts will be used to build the
                    invoice automatically. The invoice amount cannot be manually
                    changed here.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                href={`/service-jobs/${job.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                disabled={
                  submitting ||
                  job.status !== "COMPLETED" ||
                  Boolean(job.invoice)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {submitting
                  ? "Generating Invoice..."
                  : "Generate Service Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
