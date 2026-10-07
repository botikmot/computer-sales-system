"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Package,
  Trash2,
  UserRound,
  X,
  Building2,
  Save,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";

import {
  createSalesCustomer,
  createSalesInquiry,
  getCustomers,
  getProducts,
  type CustomerRecord,
  type ProductRecord,
} from "../sales-api";

type InquiryItemForm = {
  id: string;
  productId: string;
  quantity: number;
  notes: string;
};

type QuickCustomerForm = {
  name: string;
  contactNumber: string;
  email: string;
  address: string;
};

function createEmptyItem(): InquiryItemForm {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: 1,
    notes: "",
  };
}

function createEmptyCustomerForm(): QuickCustomerForm {
  return {
    name: "",
    contactNumber: "",
    email: "",
    address: "",
  };
}

function inputClassName() {
  return [
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3",
    "text-sm text-slate-900 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-400 focus:ring-4 focus:ring-blue-50",
    "disabled:cursor-not-allowed disabled:bg-slate-50",
  ].join(" ");
}

function textareaClassName() {
  return [
    "w-full resize-none rounded-xl border border-slate-200 bg-white",
    "px-3 py-2.5 text-sm text-slate-900 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-400 focus:ring-4 focus:ring-blue-50",
    "disabled:cursor-not-allowed disabled:bg-slate-50",
  ].join(" ");
}

function modalInputClassName() {
  return [
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3",
    "text-sm text-slate-900 outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
  ].join(" ");
}

export function NewInquiryForm() {
  const router = useRouter();

  const user = getCurrentUser();

  const branchId = user?.branch?.id ?? user?.branchId ?? "";

  const branchName = user?.branch?.name ?? "Unassigned branch";

  const canQuickCreateCustomer =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "SALES";

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);

  const [customerId, setCustomerId] = useState("");

  const [items, setItems] = useState<InquiryItemForm[]>([createEmptyItem()]);

  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState<{
    inquiryNo: string;
    customerName: string;
    itemCount: number;
  } | null>(null);

  /* ------------------------------------------------------------------
   * Quick Add Customer
   * ---------------------------------------------------------------- */

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [customerForm, setCustomerForm] = useState<QuickCustomerForm>(
    createEmptyCustomerForm(),
  );

  const [customerSaving, setCustomerSaving] = useState(false);

  const [customerModalError, setCustomerModalError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const [customerResult, productResult] = await Promise.all([
          getCustomers(),
          getProducts(),
        ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResult.filter((customer) => customer.isActive));

        setProducts(
          productResult.filter(
            (product) => product.isActive && product.trackInventory,
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load customers and products.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, []);

  const customerOptions: SelectOption[] = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
        description: [customer.code, customer.contactNumber]
          .filter(Boolean)
          .join(" • "),
      })),
    [customers],
  );

  const selectedProductIds = useMemo(() => {
    return new Set(items.map((item) => item.productId).filter(Boolean));
  }, [items]);

  function getProductOptions(currentProductId: string): SelectOption[] {
    return products.map((product) => {
      const alreadySelected =
        selectedProductIds.has(product.id) && product.id !== currentProductId;

      return {
        value: product.id,
        label: product.name,
        description: [product.sku, product.brand, product.model]
          .filter(Boolean)
          .join(" • "),
        disabled: alreadySelected,
      };
    });
  }

  function updateItem(id: string, changes: Partial<InquiryItemForm>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(id: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.id !== id);
    });
  }

  function openQuickCreateCustomer() {
    if (!canQuickCreateCustomer) {
      return;
    }

    setCustomerForm(createEmptyCustomerForm());
    setCustomerModalError("");
    setShowCustomerModal(true);
  }

  function closeQuickCreateCustomer() {
    if (customerSaving) {
      return;
    }

    setShowCustomerModal(false);
    setCustomerModalError("");
  }

  async function handleQuickCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canQuickCreateCustomer) {
      return;
    }

    const name = customerForm.name.trim();

    if (!name) {
      setCustomerModalError("Customer name is required.");
      return;
    }

    setCustomerSaving(true);
    setCustomerModalError("");

    try {
      const created = await createSalesCustomer({
        name,
        contactNumber: customerForm.contactNumber.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        address: customerForm.address.trim() || undefined,
      });

      setCustomers((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );

      setCustomerId(created.id);

      setShowCustomerModal(false);
      setCustomerForm(createEmptyCustomerForm());
    } catch (err) {
      setCustomerModalError(
        err instanceof Error ? err.message : "Unable to create customer.",
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  function validateForm(): string | null {
    if (!branchId) {
      return "Your account is not assigned to a branch. Please contact an administrator.";
    }

    if (!customerId) {
      return "Please select a customer.";
    }

    if (items.length === 0) {
      return "At least one item is required.";
    }

    const seenProducts = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const rowNumber = index + 1;

      if (!item.productId) {
        return `Please select a product for item ${rowNumber}.`;
      }

      if (seenProducts.has(item.productId)) {
        return `Product is duplicated in item ${rowNumber}. Each product can only appear once.`;
      }

      seenProducts.add(item.productId);

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return `Quantity for item ${rowNumber} must be at least 1.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      branchId,
      customerId,
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes.trim() || undefined,
      })),
    };

    try {
      const result = await createSalesInquiry(payload);

      setSuccess({
        inquiryNo: result.inquiryNo,
        customerName: result.customer.name,
        itemCount: result.items.length,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the sales inquiry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCustomerId("");
    setItems([createEmptyItem()]);
    setNotes("");
    setError("");
    setSuccess(null);
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <p className="mt-5 text-sm font-semibold text-emerald-600">
            Inquiry created successfully
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {success.inquiryNo}
          </h2>

          <p className="mt-2 max-w-md text-sm text-slate-500">
            The customer inquiry for{" "}
            <span className="font-semibold text-slate-700">
              {success.customerName}
            </span>{" "}
            has been recorded with{" "}
            <span className="font-semibold text-slate-700">
              {success.itemCount}
            </span>{" "}
            item
            {success.itemCount === 1 ? "" : "s"}.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/sales/inquiries")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Inquiries
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCustomer =
    customers.find((customer) => customer.id === customerId) ?? null;

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to create inquiry</p>

              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* CUSTOMER / BRANCH / NOTES */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Customer Inquiry
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Select the customer, branch, and add any inquiry context.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr_1.3fr]">
            {/* BRANCH */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Branch</p>

              <div className="flex min-h-[88px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                  <Building2 className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Assigned branch
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                    {branchName}
                  </p>
                </div>
              </div>
            </div>

            {/* CUSTOMER */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Customer <span className="text-rose-500">*</span>
              </label>

              <SearchableSelect
                value={customerId}
                onChange={setCustomerId}
                options={customerOptions}
                placeholder={
                  loadingData ? "Loading customers..." : "Select customer"
                }
                searchPlaceholder="Search customer..."
                emptyMessage="No customers found."
                loading={loadingData}
                actionLabel="Add New Customer"
                onAction={
                  canQuickCreateCustomer ? openQuickCreateCustomer : undefined
                }
              />

              <p className="text-[11px] text-slate-400">
                {selectedCustomer
                  ? `${selectedCustomer.code}${
                      selectedCustomer.contactNumber
                        ? ` • ${selectedCustomer.contactNumber}`
                        : ""
                    }`
                  : "Search inside the dropdown or add a new customer."}
              </p>
            </div>

            {/* INQUIRY NOTES */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Inquiry Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Customer requirements, context, or special requests..."
                className={textareaClassName()}
              />

              <div className="text-right text-[11px] text-slate-400">
                {notes.length}/2000
              </div>
            </div>
          </div>
        </section>

        {/* REQUESTED ITEMS */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Requested Items
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Add the products the customer is asking about.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Item {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={submitting || items.length === 1}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_100px_minmax(0,1fr)_auto]">
                  <div className="min-w-0 space-y-2">
                    <label
                      htmlFor={`product-${item.id}`}
                      className="text-sm font-semibold text-slate-700"
                    >
                      Product <span className="text-rose-500">*</span>
                    </label>

                    <SearchableSelect
                      value={item.productId}
                      onChange={(value) =>
                        updateItem(item.id, {
                          productId: value,
                        })
                      }
                      options={getProductOptions(item.productId)}
                      placeholder={
                        loadingData ? "Loading products..." : "Select product"
                      }
                      searchPlaceholder="Search SKU or product..."
                      emptyMessage="No active products found."
                      loading={loadingData}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`quantity-${item.id}`}
                      className="text-sm font-semibold text-slate-700"
                    >
                      Qty <span className="text-rose-500">*</span>
                    </label>

                    <input
                      id={`quantity-${item.id}`}
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.id, {
                          quantity: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        })
                      }
                      disabled={submitting}
                      className={inputClassName()}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`item-notes-${item.id}`}
                      className="text-sm font-semibold text-slate-700"
                    >
                      Item Notes
                    </label>

                    <input
                      id={`item-notes-${item.id}`}
                      type="text"
                      maxLength={1000}
                      value={item.notes}
                      onChange={(event) =>
                        updateItem(item.id, {
                          notes: event.target.value,
                        })
                      }
                      disabled={submitting}
                      placeholder="Optional"
                      className={inputClassName()}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={submitting || items.length === 1}
                      aria-label={`Remove item ${index + 1}`}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* ADD ITEM — ALWAYS AT THE BOTTOM */}
            <div className="pt-1">
              <button
                type="button"
                onClick={addItem}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/sales/inquiries")}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              loadingData ||
              !branchId ||
              !customerId ||
              items.length === 0
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Inquiry...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                Create Inquiry
              </>
            )}
          </button>
        </div>
      </form>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustomerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeQuickCreateCustomer();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Add New Customer
                  </h2>

                  <p className="text-xs text-slate-500">
                    Create the customer without leaving the inquiry.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeQuickCreateCustomer}
                disabled={customerSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleQuickCreateCustomer}
              className="space-y-4 p-5"
            >
              {customerModalError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {customerModalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Customer Name <span className="text-rose-500">*</span>
                </label>

                <input
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. ABC Computer Shop"
                  className={modalInputClassName()}
                  disabled={customerSaving}
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Contact Number
                  </label>

                  <input
                    value={customerForm.contactNumber}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        contactNumber: event.target.value,
                      }))
                    }
                    placeholder="09xxxxxxxxx"
                    className={modalInputClassName()}
                    disabled={customerSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="customer@example.com"
                    className={modalInputClassName()}
                    disabled={customerSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  value={customerForm.address}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional address"
                  className={`${modalInputClassName()} h-auto resize-none py-2.5`}
                  disabled={customerSaving}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeQuickCreateCustomer}
                  disabled={customerSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={customerSaving || !customerForm.name.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customerSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
