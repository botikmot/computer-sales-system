"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getSalesInquiry, type SalesInquiry } from "@/features/sales/sales-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-blue-50 text-blue-700";

    case "QUOTED":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();

  const inquiryId = params.id;

  const [inquiry, setInquiry] = useState<SalesInquiry | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!inquiryId) {
      return;
    }

    let cancelled = false;

    async function loadInquiry() {
      try {
        setLoading(true);
        setError("");

        const result = await getSalesInquiry(inquiryId);

        if (!cancelled) {
          setInquiry(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load inquiry.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInquiry();

    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      </AppShell>
    );
  }

  if (error || !inquiry) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/inquiries"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inquiries
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to load inquiry</p>

                <p className="mt-1">
                  {error || "The requested inquiry was not found."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasQuotation =
    Boolean(inquiry.quotations?.length) || inquiry.status === "QUOTED";

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/sales/inquiries"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inquiries
            </Link>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-primary">
                  Sales Inquiry
                </p>

                <div className="mt-0.5 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {inquiry.inquiryNo}
                  </h1>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                      inquiry.status,
                    )}`}
                  >
                    {inquiry.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Recorded on {formatDate(inquiry.inquiryDate)}
                </p>
              </div>
            </div>
          </div>

          {!hasQuotation && (
            <Link
              href={`/sales/quotations/new?inquiryId=${inquiry.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              Create Quotation
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>

        {/* CUSTOMER + BRANCH */}
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Customer</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Customer associated with this inquiry.
              </p>
            </div>

            <div className="p-5">
              <p className="text-lg font-semibold text-slate-900">
                {inquiry.customer.name}
              </p>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {inquiry.customer.code}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Contact
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {inquiry.customer.contactNumber || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 truncate text-sm text-slate-700">
                    {inquiry.customer.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Branch</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Branch where this inquiry was recorded.
              </p>
            </div>

            <div className="p-5">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Branch
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {inquiry.branch.name}
                </p>

                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  {inquiry.branch.code}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* ITEMS */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Requested Items</h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Products requested by the customer.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {inquiry.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Package className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.product.name}
                  </p>

                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {item.product.sku}
                  </p>

                  {item.notes && (
                    <p className="mt-2 text-xs text-slate-500">{item.notes}</p>
                  )}
                </div>

                <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-2 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Quantity
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-slate-800">
                    {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NOTES */}
        {inquiry.notes && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Inquiry Notes</h2>
            </div>

            <div className="p-5">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {inquiry.notes}
              </p>
            </div>
          </section>
        )}

        {/* QUOTATION STATE */}
        {hasQuotation && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  This inquiry has moved to quotation.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {inquiry.quotations?.[0]?.quotationNo
                    ? `Quotation ${inquiry.quotations[0].quotationNo} is associated with this inquiry.`
                    : "A quotation has already been created for this inquiry."}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
