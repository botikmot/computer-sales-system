"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Package,
  Send,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  getPurchaseRequest,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  type PurchaseRequest,
  type PurchaseRequestStatus,
} from "@/features/purchasing/purchase-requests-api";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: PurchaseRequestStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "SUBMITTED":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    case "REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-100";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500 border-slate-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getStatusLabel(status: PurchaseRequestStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "SUBMITTED":
      return "Submitted";

    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

function getStatusDescription(status: PurchaseRequestStatus) {
  switch (status) {
    case "DRAFT":
      return "This request is still being prepared.";

    case "SUBMITTED":
      return "This request is awaiting approval.";

    case "APPROVED":
      return "This request has been approved for the purchasing workflow.";

    case "REJECTED":
      return "This request was rejected and cannot continue in its current state.";

    case "CANCELLED":
      return "This request has been cancelled.";

    default:
      return "";
  }
}

type ActionType = "submit" | "approve" | "reject" | "cancel";

export default function PurchaseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [request, setRequest] = useState<PurchaseRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPurchaseRequest() {
      try {
        const result = await getPurchaseRequest(id);

        if (cancelled) {
          return;
        }

        setRequest(result);
        setError("");
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase request.",
        );

        setLoading(false);
      }
    }

    void fetchPurchaseRequest();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function reloadRequest() {
    const result = await getPurchaseRequest(id);
    setRequest(result);
  }

  async function handleAction(action: ActionType) {
    if (!request) {
      return;
    }

    setActionLoading(action);
    setActionError("");

    try {
      switch (action) {
        case "submit":
          await submitPurchaseRequest(request.id);
          break;

        case "approve":
          await approvePurchaseRequest(request.id);
          break;

        case "reject":
          await rejectPurchaseRequest(request.id);
          break;

        case "cancel":
          await cancelPurchaseRequest(request.id);
          break;
      }

      await reloadRequest();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to update purchase request.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  function actionDisabled() {
    return actionLoading !== null;
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading purchase request...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !request) {
    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Purchasing"
            title="Purchase Request"
            description="Unable to load the requested purchase request."
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

          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Purchase request could not be loaded
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {error || "Purchase request not found."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalRequestedQuantity = request.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const canSubmit = request.status === "DRAFT";
  const canApprove = request.status === "SUBMITTED";
  const canReject = request.status === "SUBMITTED";
  const canCancel =
    request.status === "DRAFT" || request.status === "SUBMITTED";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Purchasing"
          title={request.requestNo}
          description="Review purchase request details, requested items, and workflow status."
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Purchase Request
                  </p>

                  <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                    {request.requestNo}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(request.createdAt)}
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
                    getStatusClass(request.status),
                  ].join(" ")}
                >
                  {getStatusLabel(request.status)}
                </span>

                <p className="mt-1 text-right text-xs text-slate-400">
                  {getStatusDescription(request.status)}
                </p>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Action failed
                  </p>

                  <p className="mt-1 text-xs text-rose-700">{actionError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-3">
            <InfoBlock
              label="Branch"
              value={request.branch?.name ?? "—"}
              secondary={request.branch?.code ?? ""}
            />

            <InfoBlock
              label="Purpose"
              value={request.purpose || "No purpose specified"}
            />

            <InfoBlock
              label="Requested Items"
              value={String(request.items.length)}
              secondary={`${totalRequestedQuantity} total units`}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Requested Items
                </p>

                <p className="text-xs text-slate-400">
                  Products and quantities requested for purchasing.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    SKU
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Unit
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Quantity
                  </th>

                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {request.items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.product?.name ?? "Unknown product"}
                        </p>

                        {(item.product?.brand || item.product?.model) && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {[item.product.brand, item.product.model]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {item.product?.sku ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {item.product?.unit ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {item.quantity}
                      </span>
                    </td>

                    <td className="max-w-[280px] px-5 py-4">
                      <p className="truncate text-sm text-slate-600">
                        {item.notes || "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {request.notes && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Request Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {request.notes}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Workflow Actions
                </p>

                <p className="text-xs text-slate-400">
                  Available actions depend on the current request status.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-5 py-5">
            {canSubmit && (
              <button
                type="button"
                disabled={actionDisabled()}
                onClick={() => void handleAction("submit")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "submit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Request
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                disabled={actionDisabled()}
                onClick={() => void handleAction("approve")}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </button>
            )}

            {canReject && (
              <button
                type="button"
                disabled={actionDisabled()}
                onClick={() => void handleAction("reject")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "reject" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                disabled={actionDisabled()}
                onClick={() => void handleAction("cancel")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "cancel" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancel Request
              </button>
            )}

            {request.status === "APPROVED" && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
                Approved and ready for the supplier quotation stage.
              </div>
            )}

            {request.status === "REJECTED" && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
                This purchase request has been rejected.
              </div>
            )}

            {request.status === "CANCELLED" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500">
                This purchase request has been cancelled.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function InfoBlock({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>

      {secondary && (
        <p className="mt-0.5 text-xs text-slate-400">{secondary}</p>
      )}
    </div>
  );
}
