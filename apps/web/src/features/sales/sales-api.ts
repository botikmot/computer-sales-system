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
