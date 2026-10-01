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

export async function getSalesReturns() {
  return apiFetch<SalesReturn[]>("/sales/returns");
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

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  return apiFetch<CustomerPayment[]>("/sales/customer-payments");
}

export async function getCustomerPayment(id: string): Promise<CustomerPayment> {
  return apiFetch<CustomerPayment>(`/sales/customer-payments/${id}`);
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  return apiFetch<CustomerRecord[]>("/customers");
}

export async function getProducts(): Promise<ProductRecord[]> {
  return apiFetch<ProductRecord[]>("/products");
}

export async function getSalesInquiries(): Promise<SalesInquiry[]> {
  return apiFetch<SalesInquiry[]>("/sales/inquiries");
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

export async function getSalesQuotations(): Promise<SalesQuotation[]> {
  return apiFetch<SalesQuotation[]>("/sales/quotations");
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

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return apiFetch<SalesOrder[]>("/sales/orders");
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

export async function getSalesInvoices(): Promise<SalesInvoice[]> {
  return apiFetch<SalesInvoice[]>("/sales/invoices");
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
