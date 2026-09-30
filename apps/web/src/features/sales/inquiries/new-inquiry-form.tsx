"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Package,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { SearchableSelect } from "@/components/ui/searchable-select";

import {
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

function createEmptyItem(): InquiryItemForm {
  return {
    id: crypto.randomUUID(),
    productId: "",
    quantity: 1,
    notes: "",
  };
}

export function NewInquiryForm() {
  const router = useRouter();

  const user = getCurrentUser();

  const branchId = user?.branch?.id ?? user?.branchId ?? "";

  const branchName = user?.branch?.name ?? "Unassigned branch";

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  const [products, setProducts] = useState<ProductRecord[]>([]);

  const [customerId, setCustomerId] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");

  const [productSearch, setProductSearch] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        setLoadingData(true);
        setError("");

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

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(search) ||
        customer.code.toLowerCase().includes(search) ||
        customer.contactNumber?.toLowerCase().includes(search) ||
        customer.email?.toLowerCase().includes(search)
      );
    });
  }, [customerSearch, customers]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.brand?.toLowerCase().includes(search) ||
        product.model?.toLowerCase().includes(search)
      );
    });
  }, [productSearch, products]);

  function updateItem(id: string, changes: Partial<InquiryItemForm>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
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

  function getProductOptions(selectedProductId: string) {
    const selectedProduct = products.find(
      (product) => product.id === selectedProductId,
    );

    if (
      !selectedProduct ||
      filteredProducts.some((product) => product.id === selectedProductId)
    ) {
      return filteredProducts;
    }

    return [selectedProduct, ...filteredProducts];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!branchId) {
      setError(
        "Your account is not assigned to a branch. Please contact an administrator.",
      );
      return;
    }

    if (!customerId) {
      setError("Please select a customer before creating the inquiry.");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1,
    );

    if (invalidItem) {
      setError(
        "Please select a product and enter a valid quantity for every item.",
      );
      return;
    }

    const productIds = items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      setError("A product can only be added once to an inquiry.");
      return;
    }

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
      setSubmitting(true);

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
    setCustomerSearch("");
    setProductSearch("");
    setItems([createEmptyItem()]);
    setNotes("");
    setError("");
    setSuccess(null);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">Unable to create inquiry</p>

            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* CUSTOMER */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">Customer</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Select the customer making the inquiry.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="customer-search"
              className="text-sm font-semibold text-slate-700"
            >
              Find customer
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="customer-search"
                type="search"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search by name, code, phone, or email"
                disabled={loadingData}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="customer"
              className="text-sm font-semibold text-slate-700"
            >
              Customer
            </label>

            <SearchableSelect
              value={customerId}
              onChange={setCustomerId}
              options={filteredCustomers.map((customer) => ({
                value: customer.id,
                label: customer.name,
                description: customer.code,
              }))}
              placeholder={
                loadingData ? "Loading customers..." : "Select customer"
              }
              searchPlaceholder="Search customer..."
              emptyMessage="No customers found."
              loading={loadingData}
            />
          </div>
        </div>
      </section>

      {/* BRANCH */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Branch</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Inquiry will be recorded under your assigned branch.
          </p>
        </div>

        <div className="p-5">
          <div className="flex min-h-[56px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Branch
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {branchName}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ITEMS */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">Requested Items</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Add the products the customer is asking about.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search products..."
              disabled={loadingData}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="space-y-4 p-5">
          {items.map((item, index) => {
            //const options = getProductOptions(item.productId);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Item {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <label
                      htmlFor={`product-${item.id}`}
                      className="text-sm font-semibold text-slate-700"
                    >
                      Product
                    </label>

                    <SearchableSelect
                      value={item.productId}
                      onChange={(value) =>
                        updateItem(item.id, {
                          productId: value,
                        })
                      }
                      options={getProductOptions(item.productId).map(
                        (product) => ({
                          value: product.id,
                          label: product.name,
                          description: product.sku,
                        }),
                      )}
                      placeholder={
                        loadingData ? "Loading products..." : "Select product"
                      }
                      searchPlaceholder="Search product..."
                      emptyMessage="No products found."
                      loading={loadingData}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`quantity-${item.id}`}
                      className="text-sm font-semibold text-slate-700"
                    >
                      Quantity
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
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </section>

      {/* NOTES */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-950">Inquiry Notes</h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Add any additional customer requirements or context.
          </p>
        </div>

        <div className="p-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Enter notes about this customer inquiry..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />

          <div className="mt-2 text-right text-[11px] text-slate-400">
            {notes.length}/2000
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/")}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
  );
}
