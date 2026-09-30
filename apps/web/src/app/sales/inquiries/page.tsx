"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getSalesInquiries,
  type SalesInquiry,
} from "@/features/sales/sales-api";

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

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<SalesInquiry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInquiries() {
      try {
        const result = await getSalesInquiries();

        if (!cancelled) {
          setInquiries(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load inquiries.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInquiries();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Sales</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Customer Inquiries
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Capture customer requests before preparing a quotation.
            </p>
          </div>

          <Link
            href="/sales/inquiries/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            New Inquiry
          </Link>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load inquiries</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Inquiry Records</h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Latest customer inquiries
            </p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No inquiries yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Start by recording your first customer inquiry.
              </p>

              <Link
                href="/sales/inquiries/new"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create First Inquiry
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Inquiry
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Items
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {inquiry.inquiryNo}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {inquiry.customer.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {inquiry.customer.code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-[260px] flex-wrap gap-1.5">
                          {inquiry.items.slice(0, 2).map((item) => (
                            <span
                              key={item.id}
                              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                            >
                              {item.quantity} × {item.product.name}
                            </span>
                          ))}

                          {inquiry.items.length > 2 && (
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-primary">
                              +{inquiry.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(inquiry.inquiryDate)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${getStatusClass(
                            inquiry.status,
                          )}`}
                        >
                          {inquiry.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {inquiry.status === "OPEN" ? (
                          <Link
                            href={`/sales/quotations/new?inquiryId=${inquiry.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-primary transition hover:bg-blue-100"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Create Quotation
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            Quoted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
