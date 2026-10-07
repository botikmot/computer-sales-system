"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Package,
  Send,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getReceiving,
  postReceiving,
  verifyReceiving,
  type Receiving,
} from "@/features/purchasing/receivings-api";

import { getCurrentUser } from "@/lib/auth/session";

type VerificationLine = {
  receivingItemId: string;
  quantityAccepted: number;
  quantityRejected: number;
  qualityNotes: string;
};

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getCheckStatusClass(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-blue-50 text-blue-700";

    case "PENDING":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getQualityStatusClass(status: string) {
  switch (status) {
    case "PASSED":
      return "bg-emerald-50 text-emerald-700";

    case "PARTIAL":
      return "bg-amber-50 text-amber-700";

    case "FAILED":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

export default function ReceivingDetailPage() {
  const params = useParams();

  const user = getCurrentUser();
  const role = user?.role;

  const id = typeof params.id === "string" ? params.id : "";

  const [receiving, setReceiving] = useState<Receiving | null>(null);

  const [verificationLines, setVerificationLines] = useState<
    VerificationLine[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadReceiving() {
      try {
        setLoading(true);
        setError("");

        const result = await getReceiving(id);

        if (cancelled) {
          return;
        }

        setReceiving(result);

        setVerificationLines(
          result.items.map((item) => ({
            receivingItemId: item.id,
            quantityAccepted: item.quantityAccepted,
            quantityRejected: item.quantityRejected,
            qualityNotes: item.qualityNotes ?? "",
          })),
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load receiving report.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReceiving();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateAccepted(index: number, value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setVerificationLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              quantityAccepted: Math.floor(parsed),
            }
          : line,
      ),
    );
  }

  function updateRejected(index: number, value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    setVerificationLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              quantityRejected: Math.floor(parsed),
            }
          : line,
      ),
    );
  }

  function updateQualityNotes(index: number, value: string) {
    setVerificationLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              qualityNotes: value,
            }
          : line,
      ),
    );
  }

  const verificationState = useMemo(() => {
    if (!receiving) {
      return {
        valid: false,
        complete: false,
        totalAccepted: 0,
        totalRejected: 0,
      };
    }

    let complete = true;
    let totalAccepted = 0;
    let totalRejected = 0;

    for (const item of receiving.items) {
      const line = verificationLines.find(
        (entry) => entry.receivingItemId === item.id,
      );

      if (!line) {
        complete = false;
        continue;
      }

      totalAccepted += line.quantityAccepted;
      totalRejected += line.quantityRejected;

      if (
        line.quantityAccepted < 0 ||
        line.quantityRejected < 0 ||
        line.quantityAccepted + line.quantityRejected !== item.quantityReceived
      ) {
        complete = false;
      }
    }

    return {
      valid: complete && receiving.items.length > 0,
      complete,
      totalAccepted,
      totalRejected,
    };
  }, [receiving, verificationLines]);

  async function handleVerify() {
    if (!receiving) {
      return;
    }

    if (!verificationState.valid) {
      setError(
        "Each item must have accepted + rejected quantities equal to the received quantity.",
      );
      setSuccessMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const result = await verifyReceiving(receiving.id, {
        items: verificationLines.map((line) => ({
          receivingItemId: line.receivingItemId,
          quantityAccepted: line.quantityAccepted,
          quantityRejected: line.quantityRejected,
          qualityNotes: line.qualityNotes.trim() || undefined,
        })),
      });

      setReceiving(result);

      setVerificationLines(
        result.items.map((item) => ({
          receivingItemId: item.id,
          quantityAccepted: item.quantityAccepted,
          quantityRejected: item.quantityRejected,
          qualityNotes: item.qualityNotes ?? "",
        })),
      );

      setSuccessMessage(
        "Receiving report verified successfully. It is now ready for posting.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify receiving report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePost() {
    if (!receiving) {
      return;
    }

    const confirmed = window.confirm(
      "Post this receiving report to inventory? This will update stock quantities and inventory cost.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const result = await postReceiving(receiving.id);

      setReceiving(result);

      setSuccessMessage(
        "Receiving posted successfully. Accepted quantities have been added to inventory.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to post receiving report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading receiving report...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!receiving) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/receiving"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Receiving
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load receiving report</p>

              <p className="mt-0.5">
                {error || "Receiving report was not found."}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const canVerify =
    (role === "ADMIN" || role === "MANAGER" || role === "INVENTORY") &&
    receiving.status === "DRAFT" &&
    receiving.checkStatus === "PENDING";

  const canPost =
    (role === "ADMIN" || role === "MANAGER" || role === "INVENTORY") &&
    receiving.status === "DRAFT" &&
    receiving.checkStatus === "VERIFIED";

  const totalReceived = receiving.items.reduce(
    (sum, item) => sum + item.quantityReceived,
    0,
  );

  const acceptedCost = receiving.items.reduce((sum, item) => {
    const accepted = verificationLines.find(
      (line) => line.receivingItemId === item.id,
    )?.quantityAccepted;

    return (
      sum +
      (accepted ?? item.quantityAccepted) *
        Number(item.purchaseOrderItem.unitCost)
    );
  }, 0);

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        {/* BACK */}
        <Link
          href="/receiving"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Receiving
        </Link>

        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Inventory</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {receiving.receivingNo}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getStatusClass(
                  receiving.status,
                )}`}
              >
                {receiving.status}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${getCheckStatusClass(
                  receiving.checkStatus,
                )}`}
              >
                {receiving.checkStatus}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Supplier delivery receiving and inventory verification details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canVerify && (
              <button
                type="button"
                disabled={submitting || !verificationState.valid}
                onClick={() => void handleVerify()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                Verify Receiving
              </button>
            )}

            {canPost && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handlePost()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post to Inventory
              </button>
            )}
          </div>
        </section>

        {/* ERROR / SUCCESS */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Receiving action failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Action completed</p>
              <p className="mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Purchase Order"
            value={receiving.purchaseOrder.poNumber}
            icon={<FileText className="h-4 w-4" />}
          />

          <SummaryCard
            label="Supplier"
            value={receiving.purchaseOrder.supplier.name}
            icon={<Truck className="h-4 w-4" />}
          />

          <SummaryCard
            label="Received Quantity"
            value={String(totalReceived)}
            icon={<Package className="h-4 w-4" />}
          />

          <SummaryCard
            label="Received Date"
            value={formatDate(receiving.receivedDate)}
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </section>

        {/* PO / RECEIVING INFO */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">Purchase Order</h2>
            </div>

            <div className="mt-5 space-y-3">
              <InfoRow
                label="PO Number"
                value={receiving.purchaseOrder.poNumber}
              />

              <InfoRow
                label="Supplier"
                value={receiving.purchaseOrder.supplier.name}
              />

              <InfoRow
                label="PO Status"
                value={receiving.purchaseOrder.status}
              />

              <InfoRow
                label="Order Date"
                value={formatDate(receiving.purchaseOrder.orderDate)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-slate-950">
                Receiving Information
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <InfoRow
                label="Reference No."
                value={receiving.referenceNo || "—"}
              />

              <InfoRow
                label="Received Date"
                value={formatDate(receiving.receivedDate)}
              />

              <InfoRow label="Check Status" value={receiving.checkStatus} />

              <InfoRow
                label="Checked At"
                value={formatDate(receiving.checkedAt)}
              />
            </div>

            {receiving.notes && (
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Notes
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {receiving.notes}
                </p>
              </div>
            )}

            {receiving.checkNotes && (
              <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-500">
                  Check Notes
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  {receiving.checkNotes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ITEMS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />

                <h2 className="font-semibold text-slate-950">
                  Receiving Items
                </h2>
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Review quantities and quality before posting to inventory.
              </p>
            </div>

            {canVerify && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Verification</p>

                <p
                  className={`text-sm font-semibold ${
                    verificationState.valid
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {verificationState.valid
                    ? "Ready to verify"
                    : "Check quantities"}
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <TableHeader>Product</TableHeader>
                  <TableHeader>SKU</TableHeader>
                  <TableHeader align="right">Received</TableHeader>
                  <TableHeader align="right">Accepted</TableHeader>
                  <TableHeader align="right">Rejected</TableHeader>
                  <TableHeader>Check</TableHeader>
                  <TableHeader align="right">Unit Cost</TableHeader>
                  <TableHeader>Quality Notes</TableHeader>
                </tr>
              </thead>

              <tbody>
                {receiving.items.map((item, index) => {
                  const line = verificationLines[index];

                  const checkedTotal =
                    (line?.quantityAccepted ?? 0) +
                    (line?.quantityRejected ?? 0);

                  const lineValid = checkedTotal === item.quantityReceived;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.product.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Unit: {item.product.unit || "pcs"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {item.product.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.quantityReceived}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {canVerify ? (
                          <input
                            type="number"
                            min={0}
                            max={item.quantityReceived}
                            step={1}
                            value={line?.quantityAccepted ?? 0}
                            disabled={submitting}
                            onChange={(event) =>
                              updateAccepted(index, event.target.value)
                            }
                            className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-800">
                            {item.quantityAccepted}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {canVerify ? (
                          <input
                            type="number"
                            min={0}
                            max={item.quantityReceived}
                            step={1}
                            value={line?.quantityRejected ?? 0}
                            disabled={submitting}
                            onChange={(event) =>
                              updateRejected(index, event.target.value)
                            }
                            className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-800">
                            {item.quantityRejected}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {canVerify ? (
                          lineValid ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              Balanced
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                              {checkedTotal} / {item.quantityReceived}
                            </span>
                          )
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getQualityStatusClass(
                              item.qualityStatus,
                            )}`}
                          >
                            {item.qualityStatus}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {formatCurrency(item.purchaseOrderItem.unitCost)}
                      </td>

                      <td className="px-5 py-4">
                        {canVerify ? (
                          <input
                            type="text"
                            maxLength={500}
                            value={line?.qualityNotes ?? ""}
                            disabled={submitting}
                            onChange={(event) =>
                              updateQualityNotes(index, event.target.value)
                            }
                            placeholder="Optional quality notes"
                            className="h-10 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                          />
                        ) : (
                          <span className="text-sm text-slate-500">
                            {item.qualityNotes || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* VERIFY SUMMARY */}
        {canVerify && (
          <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 h-5 w-5 text-amber-600" />

                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Verification required
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Every receiving item must be checked before posting.
                    Accepted and rejected quantities must equal the received
                    quantity for each item.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="font-semibold text-slate-950">
                Verification Summary
              </h2>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Received" value={String(totalReceived)} />

                <SummaryRow
                  label="Accepted"
                  value={String(verificationState.totalAccepted)}
                  valueClass="text-emerald-700"
                />

                <SummaryRow
                  label="Rejected"
                  value={String(verificationState.totalRejected)}
                  valueClass="text-rose-700"
                />

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Estimated Accepted Cost
                    </span>

                    <span className="text-lg font-bold text-slate-950">
                      {formatCurrency(acceptedCost)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting || !verificationState.valid}
                  onClick={() => void handleVerify()}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Verify Receiving
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* POST SUMMARY */}
        {canPost && (
          <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Receiving verified
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    The quantities have been verified. Posting this report will
                    update inventory using the accepted quantities.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="font-semibold text-slate-950">Ready to Post</h2>

              <div className="mt-5 space-y-3">
                <SummaryRow
                  label="Accepted"
                  value={String(
                    receiving.items.reduce(
                      (sum, item) => sum + item.quantityAccepted,
                      0,
                    ),
                  )}
                  valueClass="text-emerald-700"
                />

                <SummaryRow
                  label="Rejected"
                  value={String(
                    receiving.items.reduce(
                      (sum, item) => sum + item.quantityRejected,
                      0,
                    ),
                  )}
                  valueClass="text-rose-700"
                />

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs leading-5 text-slate-400">
                    Posting will update inventory quantity, weighted average
                    cost, inventory movements, and purchase order receiving
                    quantities.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handlePost()}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post to Inventory
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* POSTED STATE */}
        {receiving.status === "POSTED" && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Receiving posted to inventory
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  This receiving report has been posted. Accepted quantities
                  have been recorded in inventory and the purchase order has
                  been updated.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>

      <p className="mt-3 truncate text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="text-right text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "text-slate-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>

      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
