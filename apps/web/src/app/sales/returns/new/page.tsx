"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";

import {
  createSalesReturn,
  getCashBankAccounts,
  getSalesInvoices,
  getSalesReturns,
  type CashBankAccount,
  type SalesInvoice,
  type SalesReturn,
  type SalesReturnSettlementMode,
} from "@/features/sales/sales-api";

function formatCurrency(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getSettlementLabel(mode: SalesReturnSettlementMode) {
  switch (mode) {
    case "CASH_REFUND":
      return "Cash Refund";

    case "AR_ADJUSTMENT":
      return "AR Adjustment";

    case "NO_REFUND":
      return "No Refund";

    default:
      return mode;
  }
}

type ListResult<T> = T[] | { items: T[] };

function getListItems<T>(result: ListResult<T>): T[] {
  return Array.isArray(result) ? result : result.items;
}

export default function NewSalesReturnPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);

  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [settlementMode, setSettlementMode] =
    useState<SalesReturnSettlementMode>("NO_REFUND");

  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [refundAccountId, setRefundAccountId] = useState("");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * Load invoices + existing sales returns.
   *
   * Existing posted returns are used only to calculate the remaining
   * returnable quantity in the UI. The backend remains the final validator.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [invoiceResult, returnResult] = await Promise.all([
          getSalesInvoices(),
          getSalesReturns(),
        ]);

        if (cancelled) return;

        const invoiceItems = getListItems(invoiceResult);
        const returnItems = getListItems(returnResult);

        setInvoices(invoiceItems.filter((item) => item.status === "POSTED"));

        setReturns(returnItems);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales return data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Existing returned quantity per invoice item.
   */
  const returnedQuantities = useMemo(() => {
    const map: Record<string, number> = {};

    for (const salesReturn of returns) {
      if (salesReturn.status !== "POSTED") {
        continue;
      }

      if (salesReturn.salesInvoiceId !== invoice?.id) {
        continue;
      }

      for (const item of salesReturn.items) {
        map[item.salesInvoiceItemId] =
          (map[item.salesInvoiceItemId] ?? 0) + item.quantity;
      }
    }

    return map;
  }, [returns, invoice?.id]);

  /*
   * Select invoice.
   */
  async function handleInvoiceChange(value: string) {
    setInvoiceId(value);
    setFormError("");
    setSuccessMessage("");
    setQuantities({});
    setSettlementMode("NO_REFUND");
    setRefundAccountId("");

    if (!value) {
      setInvoice(null);
      return;
    }

    const cachedInvoice = invoices.find((item) => item.id === value);

    if (cachedInvoice) {
      setInvoice(cachedInvoice);
      return;
    }

    try {
      setInvoiceLoading(true);

      const result = await getSalesInvoices();

      const invoiceItems = getListItems(result);

      const selected = invoiceItems.find((item) => item.id === value);

      if (!selected) {
        throw new Error("Sales invoice not found.");
      }

      setInvoice(selected);
    } catch (err) {
      setInvoice(null);
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to load the selected invoice.",
      );
    } finally {
      setInvoiceLoading(false);
    }
  }

  /*
   * Load refund accounts only when CASH_REFUND is selected.
   */
  useEffect(() => {
    if (settlementMode !== "CASH_REFUND") {
      return;
    }

    let cancelled = false;

    async function loadAccounts() {
      try {
        setAccountsLoading(true);
        setFormError("");

        const result = await getCashBankAccounts();

        if (!cancelled) {
          const activeAccounts = result.filter((account) => account.isActive);

          setAccounts(activeAccounts);

          if (activeAccounts.length > 0) {
            setRefundAccountId((current) => current || activeAccounts[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAccounts([]);

          setFormError(
            err instanceof Error
              ? err.message
              : "Unable to load refund accounts.",
          );
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [settlementMode]);

  const selectedItems = useMemo(() => {
    if (!invoice) {
      return [];
    }

    return invoice.items
      .map((item) => {
        const alreadyReturned = returnedQuantities[item.id] ?? 0;

        const remainingQuantity = Math.max(item.quantity - alreadyReturned, 0);

        const quantity = Math.min(quantities[item.id] ?? 0, remainingQuantity);

        return {
          ...item,
          alreadyReturned,
          remainingQuantity,
          returnQuantity: quantity,
        };
      })
      .filter((item) => item.returnQuantity > 0);
  }, [invoice, quantities, returnedQuantities]);

  const returnSubtotal = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.returnQuantity,
      0,
    );
  }, [selectedItems]);

  const estimatedReturnTotal = useMemo(() => {
    if (!invoice || returnSubtotal <= 0) {
      return 0;
    }

    if (Number(invoice.subtotal) <= 0) {
      return roundMoney(returnSubtotal);
    }

    const ratio = returnSubtotal / Number(invoice.subtotal);

    const discountShare = Number(invoice.discount) * ratio;
    const taxShare = Number(invoice.tax) * ratio;

    return roundMoney(returnSubtotal - discountShare + taxShare);
  }, [invoice, returnSubtotal]);

  const cashRefundAllowed =
    invoice !== null &&
    estimatedReturnTotal > 0 &&
    estimatedReturnTotal <= Number(invoice.amountPaid);

  const arAdjustmentAllowed =
    invoice !== null &&
    invoice.paymentMode === "CREDIT" &&
    estimatedReturnTotal > 0 &&
    estimatedReturnTotal <= Number(invoice.balanceDue);

  function getMaxReturnableQuantity(itemId: string, originalQuantity: number) {
    const alreadyReturned = returnedQuantities[itemId] ?? 0;

    return Math.max(originalQuantity - alreadyReturned, 0);
  }

  function updateQuantity(itemId: string, value: string) {
    const parsed = Number(value);

    setQuantities((current) => ({
      ...current,
      [itemId]: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0,
    }));
  }

  function validateForm() {
    if (!invoice) {
      return "Select a sales invoice.";
    }

    if (selectedItems.length === 0) {
      return "Select at least one item and enter a return quantity.";
    }

    if (returnSubtotal <= 0 || estimatedReturnTotal <= 0) {
      return "Sales return total must be greater than zero.";
    }

    if (settlementMode === "CASH_REFUND") {
      if (!refundAccountId) {
        return "Select a refund Cash/Bank account.";
      }

      if (!cashRefundAllowed) {
        return "Cash refund cannot exceed the amount already paid on the invoice.";
      }
    }

    if (settlementMode === "AR_ADJUSTMENT") {
      if (invoice.paymentMode !== "CREDIT") {
        return "AR adjustment is only available for credit sales invoices.";
      }

      if (!arAdjustmentAllowed) {
        return "AR adjustment cannot exceed the outstanding receivable balance.";
      }
    }

    return "";
  }

  async function handleSubmit() {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      setSuccessMessage("");
      return;
    }

    if (!invoice) {
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setSuccessMessage("");

      await createSalesReturn({
        salesInvoiceId: invoice.id,
        settlementMode,

        ...(settlementMode === "CASH_REFUND" && {
          refundAccountId,
        }),

        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,

        items: selectedItems.map((item) => ({
          salesInvoiceItemId: item.id,
          quantity: item.returnQuantity,
        })),
      });

      setSuccessMessage("Sales return posted successfully.");

      setQuantities({});
      setSettlementMode("NO_REFUND");
      setRefundAccountId("");
      setReason("");
      setNotes("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to create sales return.",
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
            Loading sales return form...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Link
            href="/sales/returns"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Returns
          </Link>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load sales return data</p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-10">
        <Link
          href="/sales/returns"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales Returns
        </Link>

        <section>
          <p className="text-sm font-semibold text-primary">Sales</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            New Sales Return
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Return sold items, restore inventory, and record the appropriate
            settlement.
          </p>
        </section>

        {successMessage && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Sales Return Posted
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {successMessage}
                </p>

                <Link
                  href="/sales/returns"
                  className="mt-3 inline-flex text-sm font-semibold text-emerald-800 hover:underline"
                >
                  View Sales Returns
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />

            <h2 className="font-semibold text-slate-950">
              Source Sales Invoice
            </h2>
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sales Invoice
            </label>

            <SearchableSelect
              value={invoiceId}
              onChange={handleInvoiceChange}
              options={invoices.map((item) => ({
                value: item.id,
                label: item.invoiceNo,
                description: `${item.customer.name} • ${formatDate(
                  item.invoiceDate,
                )} • ${formatCurrency(item.total)}`,
              }))}
              placeholder="Select sales invoice"
              searchPlaceholder="Search invoice..."
              emptyMessage="No posted sales invoices found."
              disabled={invoiceLoading || submitting}
              loading={invoiceLoading}
              className="mt-2 max-w-3xl"
            />
          </div>
        </section>

        {invoice && (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">Customer</h2>
                </div>

                <div className="mt-5">
                  <p className="text-base font-semibold text-slate-900">
                    {invoice.customer.name}
                  </p>

                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {invoice.customer.code}
                  </p>

                  <p className="mt-4 text-sm text-slate-500">
                    Invoice:{" "}
                    <span className="font-mono font-semibold text-slate-700">
                      {invoice.invoiceNo}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Payment Mode:{" "}
                    <span className="font-semibold text-slate-700">
                      {invoice.paymentMode}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Invoice Balance
                  </h2>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Invoice Total
                    </p>

                    <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Amount Paid
                    </p>

                    <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
                      {formatCurrency(invoice.amountPaid)}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Current Balance Due
                      </span>

                      <span className="font-mono text-xl font-bold text-amber-600">
                        {formatCurrency(invoice.balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Items to Return
                  </h2>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Enter the quantity to return. Already-returned quantities are
                  deducted automatically.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Product
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Invoice Qty
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Returned
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Returnable
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Unit Price
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Return Qty
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item) => {
                      const returnableQuantity = getMaxReturnableQuantity(
                        item.id,
                        item.quantity,
                      );

                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.product.name}
                            </p>

                            <p className="mt-0.5 font-mono text-xs text-slate-400">
                              {item.product.sku}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                            {item.quantity}
                          </td>

                          <td className="px-5 py-4 text-right text-sm text-slate-500">
                            {returnedQuantities[item.id] ?? 0}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={`font-mono text-sm font-semibold ${
                                returnableQuantity > 0
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {returnableQuantity}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                            {formatCurrency(item.unitPrice)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <input
                              type="number"
                              min="0"
                              max={returnableQuantity}
                              step="1"
                              value={quantities[item.id] ?? ""}
                              onChange={(event) =>
                                updateQuantity(item.id, event.target.value)
                              }
                              disabled={submitting || returnableQuantity <= 0}
                              placeholder="0"
                              className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-right font-mono text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-slate-950">
                    Return Details
                  </h2>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Settlement
                    </label>

                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          "NO_REFUND",
                          "CASH_REFUND",
                          "AR_ADJUSTMENT",
                        ] as SalesReturnSettlementMode[]
                      ).map((mode) => {
                        const disabled =
                          submitting ||
                          (mode === "CASH_REFUND" &&
                            invoice.amountPaid === 0) ||
                          (mode === "AR_ADJUSTMENT" &&
                            invoice.paymentMode !== "CREDIT");

                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setSettlementMode(mode);
                              setFormError("");

                              if (mode !== "CASH_REFUND") {
                                setRefundAccountId("");
                              }
                            }}
                            disabled={disabled}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              settlementMode === mode
                                ? "border-blue-300 bg-blue-50 text-primary"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <p className="text-sm font-semibold">
                              {getSettlementLabel(mode)}
                            </p>

                            <p className="mt-1 text-[11px] leading-4 text-slate-400">
                              {mode === "CASH_REFUND" &&
                                "Return money from a Cash/Bank account."}

                              {mode === "AR_ADJUSTMENT" &&
                                "Reduce the customer's credit receivable."}

                              {mode === "NO_REFUND" &&
                                "Return items without refund or AR adjustment."}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {settlementMode === "CASH_REFUND" && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Refund Cash / Bank Account
                      </label>

                      <SearchableSelect
                        value={refundAccountId}
                        onChange={setRefundAccountId}
                        options={accounts.map((account) => ({
                          value: account.id,
                          label: `${account.name} — ${account.accountType}`,
                          description:
                            account.accountNumber || "No account number",
                        }))}
                        placeholder="Select refund account"
                        searchPlaceholder="Search refund account..."
                        emptyMessage="No active Cash/Bank accounts found."
                        disabled={submitting}
                        loading={accountsLoading}
                        className="mt-2"
                      />

                      {!cashRefundAllowed && (
                        <p className="mt-2 text-xs text-amber-600">
                          Cash refund cannot exceed the amount already paid on
                          this invoice.
                        </p>
                      )}
                    </div>
                  )}

                  {settlementMode === "AR_ADJUSTMENT" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      AR adjustment is available because this invoice uses
                      CREDIT payment terms. The adjustment cannot exceed the
                      current outstanding balance.
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="return-reason"
                      className="text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Reason
                    </label>

                    <textarea
                      id="return-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Why is the item being returned?"
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="return-notes"
                      className="text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      Notes
                    </label>

                    <textarea
                      id="return-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Optional notes..."
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {formError && (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                      <p>{formError}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <h2 className="font-semibold text-slate-950">Return Summary</h2>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Items Selected</span>

                    <span className="font-semibold text-slate-800">
                      {selectedItems.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Return Subtotal</span>

                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(returnSubtotal)}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Estimated Return Total
                      </span>

                      <span className="font-mono text-xl font-bold text-slate-950">
                        {formatCurrency(estimatedReturnTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Settlement
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {getSettlementLabel(settlementMode)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={
                      submitting ||
                      selectedItems.length === 0 ||
                      estimatedReturnTotal <= 0 ||
                      (settlementMode === "CASH_REFUND" &&
                        (!refundAccountId || !cashRefundAllowed)) ||
                      (settlementMode === "AR_ADJUSTMENT" &&
                        !arAdjustmentAllowed)
                    }
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Posting Return...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Post Sales Return
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
