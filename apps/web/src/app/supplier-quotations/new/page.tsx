"use client";

import { useSearchParams } from "next/navigation";

import { SupplierQuotationForm } from "@/features/purchasing/supplier-quotations/supplier-quotation-form";

export default function NewSupplierQuotationPage() {
  const searchParams = useSearchParams();

  const purchaseRequestId = searchParams.get("purchaseRequestId") ?? "";

  return <SupplierQuotationForm initialPurchaseRequestId={purchaseRequestId} />;
}
