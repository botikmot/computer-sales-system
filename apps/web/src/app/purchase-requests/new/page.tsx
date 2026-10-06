"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PurchaseRequestForm } from "@/features/purchasing/purchase-request-form";

export default function NewPurchaseRequestPage() {
  const router = useRouter();

  function handleSuccess(requestId: string) {
    router.push(`/purchase-requests/${requestId}`);
  }

  function handleCancel() {
    router.push("/purchase-requests");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="Purchasing"
          title="New Purchase Request"
          description="Create an internal request for stock replenishment or other purchasing needs."
          action={
            <Link
              href="/purchase-requests"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Requests
            </Link>
          }
        />

        <PurchaseRequestForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </AppShell>
  );
}
