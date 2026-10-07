import { apiFetch } from "@/lib/api/client";

export type CustomerRecord = {
  id: string;
  code: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive: boolean;
};

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  unit?: string | null;
  defaultSellingPrice?: string | number | null;
  defaultCostPrice?: string | number | null;
  isActive: boolean;
  trackInventory: boolean;
};

export type SalesInquiryItem = {
  id: string;
  productId: string;
  quantity: number;
  notes?: string | null;
  product: ProductRecord;
};

export type SalesInquiry = {
  id: string;
  inquiryNo: string;
  branchId: string;
  customerId: string;
  status: string;
  inquiryDate: string;
  notes?: string | null;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  items: SalesInquiryItem[];

  quotations?: SalesQuotation[];

  createdAt: string;
  updatedAt: string;
};

export type CreateSalesInquiryPayload = {
  branchId: string;
  customerId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
  }>;
};

export type SalesQuotationItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  product: ProductRecord;
};

export type SalesQuotation = {
  id: string;
  quotationNo: string;
  branchId: string;
  customerId: string;
  inquiryId: string;
  status: string;
  quotationDate: string;
  validUntil?: string | null;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  notes?: string | null;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  inquiry?: SalesInquiry;

  items: SalesQuotationItem[];
};

export type SalesOrderRecord = {
  id: string;
  orderNo: string;
  branchId: string;
  customerId: string;
  quotationId: string;
  status: string;
  orderDate: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  notes?: string | null;
};

export type CreateSalesQuotationPayload = {
  branchId: string;
  customerId: string;
  inquiryId: string;
  salespersonId: string;
  validUntil?: string;
  discount: number;
  tax: number;
  notes?: string;

  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type SalesOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;

  product: ProductRecord;
};

export type SalesOrder = {
  id: string;
  orderNo: string;
  branchId: string;
  customerId: string;
  quotationId: string;

  status: string;
  orderDate: string;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  notes?: string | null;

  deliveryMode?: string | null;
  deliveryDate?: string | null;

  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  quotation?: SalesQuotation;

  items: SalesOrderItem[];
  salesInvoice?: {
    id: string;
    invoiceNo: string;
    status: string;
    paymentMode: SalesPaymentMode;
    invoiceDate: string;
    total: string | number;
    amountPaid: string | number;
    balanceDue: string | number;
  } | null;
};

export type InventoryCheckItem = {
  salesOrderItemId: string;
  productId: string;
  requestedQuantity: number;
  inventoryQuantity: number | null;
  reservedQuantity: number;
  availableQuantity: number | null;
  available: boolean;
  inventoryTracked: boolean;
};

export type InventoryCheckResult = {
  salesOrderId: string;
  orderNo: string;
  allAvailable: boolean;
  items: InventoryCheckItem[];
};

export type SalesOrderDeliveryMode = "DELIVERY" | "CUSTOMER_PICKUP";

export type SalesPaymentMode = "CASH" | "CREDIT";

export type SalesInvoiceItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  product: ProductRecord;
};

export type AccountsReceivableRecord = {
  id: string;
  branchId: string;
  customerId: string;
  salesInvoiceId: string;
  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
};

export type SalesInvoice = {
  id: string;
  invoiceNo: string;
  branchId: string;
  customerId: string;
  salesOrderId: string;

  status: string;
  paymentMode: SalesPaymentMode;
  invoiceDate: string;
  dueDate?: string | null;

  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

  amountPaid: string | number;
  balanceDue: string | number;

  notes?: string | null;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  salesOrder?: SalesOrder;

  accountsReceivable?: AccountsReceivableRecord | null;

  items: SalesInvoiceItem[];
};

export type CustomerPayment = {
  id: string;
  paymentNo: string;

  branchId: string;
  customerId: string;

  salesInvoiceId?: string | null;
  serviceInvoiceId?: string | null;

  accountId: string;

  amount: string | number;
  paymentDate: string;

  referenceNo?: string | null;
  notes?: string | null;

  status: string;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  salesInvoice?: {
    id: string;
    invoiceNo: string;
    total: string | number;
    balanceDue: string | number;
  } | null;

  serviceInvoice?: {
    id: string;
    invoiceNo: string;
    total: string | number;
    balanceDue: string | number;
  } | null;

  account: {
    id: string;
    accountNo?: string | null;
    name: string;
    accountType: string;
  };

  cashBankTransaction?: {
    id: string;
    transactionType: string;
    direction: string;
    amount: string | number;
    transactionDate: string;
    referenceNo?: string | null;
  } | null;
};

export type CashBankAccount = {
  id: string;
  branchId: string;
  accountType: string;
  name: string;
  accountNumber?: string | null;
  openingBalance: string | number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCustomerPaymentPayload = {
  salesInvoiceId?: string;
  serviceInvoiceId?: string;
  accountId: string;
  amount: number;
  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
};

export type SalesReturnSettlementMode =
  "CASH_REFUND" | "AR_ADJUSTMENT" | "NO_REFUND";

export type SalesReturnItem = {
  id: string;
  salesReturnId: string;
  salesInvoiceItemId: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;

  product: ProductRecord;

  salesInvoiceItem?: {
    id: string;
    quantity: number;
    unitPrice: string | number;
    subtotal: string | number;
    product?: ProductRecord;
  };
};

export type SalesReturn = {
  id: string;
  returnNo: string;

  branchId: string;
  customerId: string;
  salesInvoiceId: string;

  status: string;
  settlementMode: SalesReturnSettlementMode;

  returnDate: string;

  subtotal: string | number;
  total: string | number;

  reason?: string | null;
  notes?: string | null;

  refundAccountId?: string | null;

  branch: {
    id: string;
    code: string;
    name: string;
  };

  customer: CustomerRecord;

  salesInvoice: SalesInvoice;

  items: SalesReturnItem[];

  refundAccount?: CashBankAccount | null;

  cashBankTransaction?: {
    id: string;
    transactionType: string;
    direction: string;
    amount: string | number;
    transactionDate: string;
    referenceNo?: string | null;
    notes?: string | null;
  } | null;
};

export type CreateSalesReturnItemPayload = {
  salesInvoiceItemId: string;
  quantity: number;
};

export type CreateSalesReturnPayload = {
  salesInvoiceId: string;
  settlementMode: SalesReturnSettlementMode;
  refundAccountId?: string;
  reason?: string;
  notes?: string;
  items: CreateSalesReturnItemPayload[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type SalesListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type CustomerPaymentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "paymentNo" | "paymentDate" | "amount" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type CustomerPaymentListResponse = {
  items: CustomerPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type SalesReturnListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?:
    | "returnNo"
    | "returnDate"
    | "total"
    | "status"
    | "settlementMode"
    | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type SalesReturnListResponse = {
  items: SalesReturn[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function getSalesReturns(
  query: SalesReturnListQuery = {},
): Promise<SalesReturnListResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<SalesReturnListResponse>(
    queryString ? `/sales/returns?${queryString}` : "/sales/returns",
  );
}

export async function getSalesReturn(id: string) {
  return apiFetch<SalesReturn>(`/sales/returns/${id}`);
}

export async function createSalesReturn(payload: CreateSalesReturnPayload) {
  return apiFetch<SalesReturn>("/sales/returns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getCashBankAccounts() {
  return apiFetch<CashBankAccount[]>("/cash-bank/accounts");
}

export async function createCustomerPayment(
  payload: CreateCustomerPaymentPayload,
) {
  return apiFetch<CustomerPayment>("/sales/customer-payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getCustomerPayments(
  query: CustomerPaymentListQuery = {},
): Promise<CustomerPaymentListResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<CustomerPaymentListResponse>(
    queryString
      ? `/sales/customer-payments?${queryString}`
      : "/sales/customer-payments",
  );
}

export async function getCustomerPayment(id: string): Promise<CustomerPayment> {
  return apiFetch<CustomerPayment>(`/sales/customer-payments/${id}`);
}

type ListResult<T> = T[] | { items: T[] };

export async function getCustomers(): Promise<CustomerRecord[]> {
  const result = await apiFetch<ListResult<CustomerRecord>>("/customers");

  return Array.isArray(result) ? result : result.items;
}

export async function getProducts(): Promise<ProductRecord[]> {
  const result = await apiFetch<ListResult<ProductRecord>>("/products");

  return Array.isArray(result) ? result : result.items;
}

export async function getSalesInquiries(
  query: SalesListQuery = {},
): Promise<PaginatedResponse<SalesInquiry>> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return apiFetch<PaginatedResponse<SalesInquiry>>(
    `/sales/inquiries?${params.toString()}`,
  );
}

export async function getSalesInquiry(id: string): Promise<SalesInquiry> {
  return apiFetch<SalesInquiry>(`/sales/inquiries/${id}`);
}

export async function createSalesInquiry(
  payload: CreateSalesInquiryPayload,
): Promise<SalesInquiry> {
  return apiFetch<SalesInquiry>("/sales/inquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSalesQuotations(
  query: SalesListQuery = {},
): Promise<PaginatedResponse<SalesQuotation>> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return apiFetch<PaginatedResponse<SalesQuotation>>(
    `/sales/quotations?${params.toString()}`,
  );
}

export async function getSalesQuotation(id: string): Promise<SalesQuotation> {
  return apiFetch<SalesQuotation>(`/sales/quotations/${id}`);
}

export async function createSalesQuotation(
  payload: CreateSalesQuotationPayload,
): Promise<SalesQuotation> {
  return apiFetch<SalesQuotation>("/sales/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendSalesQuotation(id: string): Promise<SalesQuotation> {
  return apiFetch<SalesQuotation>(`/sales/quotations/${id}/send`, {
    method: "POST",
  });
}

export async function acceptSalesQuotation(
  id: string,
): Promise<SalesQuotation> {
  return apiFetch<SalesQuotation>(`/sales/quotations/${id}/accept`, {
    method: "POST",
  });
}

export async function createSalesOrderFromQuotation(
  quotationId: string,
): Promise<SalesOrderRecord> {
  return apiFetch<SalesOrderRecord>(
    `/sales/orders/from-quotation/${quotationId}`,
    {
      method: "POST",
    },
  );
}

export async function getSalesOrders(
  query: SalesListQuery = {},
): Promise<PaginatedResponse<SalesOrder>> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return apiFetch<PaginatedResponse<SalesOrder>>(
    `/sales/orders?${params.toString()}`,
  );
}

export async function getSalesOrder(id: string): Promise<SalesOrder> {
  return apiFetch<SalesOrder>(`/sales/orders/${id}`);
}

export async function checkSalesOrderInventory(
  salesOrderId: string,
): Promise<InventoryCheckResult> {
  return apiFetch<InventoryCheckResult>(
    `/sales/orders/${salesOrderId}/inventory-check`,
  );
}

export async function reserveSalesOrder(
  salesOrderId: string,
): Promise<SalesOrder> {
  return apiFetch<SalesOrder>(`/sales/orders/${salesOrderId}/reserve`, {
    method: "POST",
  });
}

export async function prepareSalesOrder(
  salesOrderId: string,
): Promise<SalesOrder> {
  return apiFetch<SalesOrder>(`/sales/orders/${salesOrderId}/prepare`, {
    method: "POST",
  });
}

export async function releaseSalesOrder(
  salesOrderId: string,
  payload: {
    deliveryMode: SalesOrderDeliveryMode;
    deliveryDate?: string;
  },
): Promise<SalesOrder> {
  return apiFetch<SalesOrder>(
    `/sales/orders/${salesOrderId}/fulfillment-release`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getSalesInvoices(
  query: SalesListQuery = {},
): Promise<PaginatedResponse<SalesInvoice>> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  return apiFetch<PaginatedResponse<SalesInvoice>>(
    `/sales/invoices?${params.toString()}`,
  );
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice> {
  return apiFetch<SalesInvoice>(`/sales/invoices/${id}`);
}

export async function createSalesInvoiceFromOrder(
  salesOrderId: string,
  paymentMode: SalesPaymentMode,
): Promise<SalesInvoice> {
  return apiFetch<SalesInvoice>(`/sales/invoices/from-order/${salesOrderId}`, {
    method: "POST",
    body: JSON.stringify({
      paymentMode,
    }),
  });
}

export type CreateSalesCustomerPayload = {
  name: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  taxId?: string;
};

export async function createSalesCustomer(
  payload: CreateSalesCustomerPayload,
): Promise<CustomerRecord> {
  return apiFetch<CustomerRecord>("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
