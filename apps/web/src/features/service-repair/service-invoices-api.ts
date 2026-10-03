import { apiFetch } from "@/lib/api/client";

export type ServiceInvoiceStatus = "POSTED";

export type ServicePaymentMode = "CASH" | "CREDIT";

export type ServiceInvoiceBranch = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
};

export type ServiceInvoiceCustomer = {
  id: string;
  code: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  isActive?: boolean;
};

export type ServiceInvoiceServiceJob = {
  id: string;
  jobNo: string;
  branchId: string;
  customerId: string;
  technicianId?: string | null;
  status: string;
  diagnosticFindings?: string | null;
  laborCharge: string;
  customerApproved: boolean;
  customerApprovedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInvoiceProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  unit: string;
  defaultSellingPrice?: string | null;
  defaultCostPrice?: string | null;
  isActive: boolean;
  trackInventory: boolean;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceInvoiceItemType = "LABOR" | "PART";

export type ServiceInvoiceItem = {
  id: string;
  serviceInvoiceId: string;
  productId?: string | null;
  itemType: ServiceInvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  product?: ServiceInvoiceProduct | null;
};

export type ServiceInvoiceAccountsReceivable = {
  id: string;
  branchId: string;
  customerId: string;

  salesInvoiceId?: string | null;
  serviceInvoiceId?: string | null;

  originalAmount: string;
  amountPaid: string;
  balanceDue: string;

  status: string;
  dueDate?: string | null;
  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInvoice = {
  id: string;
  invoiceNo: string;

  branchId: string;
  customerId: string;
  serviceJobId: string;

  status: ServiceInvoiceStatus;
  paymentMode: ServicePaymentMode;

  invoiceDate: string;
  dueDate?: string | null;

  subtotal: string;
  discount: string;
  tax: string;
  total: string;

  amountPaid: string;
  balanceDue: string;

  notes?: string | null;

  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  branch: ServiceInvoiceBranch;
  customer: ServiceInvoiceCustomer;
  serviceJob: ServiceInvoiceServiceJob;

  items: ServiceInvoiceItem[];

  accountsReceivable?: ServiceInvoiceAccountsReceivable | null;
};

export type ServiceInvoiceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ServiceInvoiceStatus;
  sortBy?: "invoiceNo" | "invoiceDate" | "total" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type ServiceInvoiceListResponse = {
  data: ServiceInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateServiceInvoicePayload = {
  paymentMode: ServicePaymentMode;
  dueDate?: string;
  notes?: string;
};

export async function getServiceInvoices(
  query: ServiceInvoiceQuery = {},
): Promise<ServiceInvoiceListResponse> {
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

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const queryString = params.toString();

  return apiFetch<ServiceInvoiceListResponse>(
    `/service-repair/invoices${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getServiceInvoice(id: string): Promise<ServiceInvoice> {
  return apiFetch<ServiceInvoice>(`/service-repair/invoices/${id}`);
}

export async function createServiceInvoiceFromJob(
  serviceJobId: string,
  payload: CreateServiceInvoicePayload,
): Promise<ServiceInvoice> {
  return apiFetch<ServiceInvoice>(
    `/service-repair/invoices/from-job/${serviceJobId}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
