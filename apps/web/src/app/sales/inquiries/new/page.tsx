import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { NewInquiryForm } from "@/features/sales/inquiries/new-inquiry-form";

export default function NewInquiryPage() {
  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        <section>
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
              <p className="text-sm font-semibold text-primary">Sales</p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                New Customer Inquiry
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Start the sales process by recording what the customer is
                looking for.
              </p>
            </div>
          </div>
        </section>

        <NewInquiryForm />
      </div>
    </AppShell>
  );
}
