import { apiFetch } from "@/lib/api/client";

export type ServiceJobStatus =
  | "DRAFT"
  | "DIAGNOSING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ServiceJobBranch = {
  id: string;
  code: string;
  name: string;
};

export type ServiceJobCustomer = {
  id: string;
  code: string;
  name?: string | null;
  contactNumber?: string | null;
  email?: string | null;
};

export type ServiceJobTechnician = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  branchId?: string | null;
};

export type ServiceJobProduct = {
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
};

export type ServiceJobPart = {
  id: string;
  serviceJobId: string;
  productId: string;
  requiredQuantity: number;
  issuedQuantity: number;
  unitCost: string;
  totalCost: string;
  notes?: string | null;
  product: ServiceJobProduct;
};

export type ServiceJobInvoice = {
  id: string;
  invoiceNo: string;
  branchId: string;
  customerId: string;
  serviceJobId: string;
  status: string;
  paymentMode: string;
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
  items?: Array<Record<string, unknown>>;
  accountsReceivable?: Record<string, unknown> | null;
};

export type ServiceJob = {
  id: string;
  jobNo: string;
  branchId: string;
  customerId: string;
  technicianId?: string | null;

  status: ServiceJobStatus;

  diagnosticFindings?: string | null;
  laborCharge: string;

  customerApproved: boolean;
  customerApprovedAt?: string | null;

  startedAt?: string | null;
  completedAt?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;

  branch: ServiceJobBranch;
  customer: ServiceJobCustomer;
  technician?: ServiceJobTechnician | null;

  parts: ServiceJobPart[];

  invoice?: ServiceJobInvoice | null;
};

export type ServiceJobQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ServiceJobStatus;
  sortBy?: "jobNo" | "status" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export type ServiceJobListResponse = {
  data: ServiceJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateServiceJobPayload = {
  branchId: string;
  customerId: string;
  technicianId?: string;
  notes?: string;
};

export type DiagnoseServiceJobPayload = {
  diagnosticFindings: string;
  laborCharge: number;
  notes?: string;
};

export type AddServiceJobPartPayload = {
  productId: string;
  requiredQuantity: number;
  notes?: string;
};

export type AssignServiceTechnicianPayload = {
  technicianId: string;
};

export type IssueServicePartItem = {
  productId: string;
  quantity: number;
};

export type IssueServicePartsPayload = {
  items: IssueServicePartItem[];
};

export type IssueServicePartsResponse = {
  serviceJobId: string;
  jobNo: string;
  issued: Array<{
    productId: string;
    quantityIssued: number;
    unitCost: string;
    totalCost: string;
    balanceAfter: number;
  }>;
};

export async function issueServiceParts(
  serviceJobId: string,
  payload: IssueServicePartsPayload,
): Promise<IssueServicePartsResponse> {
  return apiFetch<IssueServicePartsResponse>(
    `/service-repair/jobs/${serviceJobId}/issue-parts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function getServiceJobs(
  query: ServiceJobQuery = {},
): Promise<ServiceJobListResponse> {
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

  return apiFetch<ServiceJobListResponse>(
    `/service-repair/jobs${queryString ? `?${queryString}` : ""}`,
  );
}

export async function getServiceJob(id: string): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}`);
}

export async function createServiceJob(
  payload: CreateServiceJobPayload,
): Promise<ServiceJob> {
  return apiFetch<ServiceJob>("/service-repair/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function diagnoseServiceJob(
  id: string,
  payload: DiagnoseServiceJobPayload,
): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/diagnose`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addServiceJobPart(
  id: string,
  payload: AddServiceJobPartPayload,
): Promise<ServiceJobPart> {
  return apiFetch<ServiceJobPart>(`/service-repair/jobs/${id}/parts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveServiceJob(id: string): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/approve`, {
    method: "POST",
  });
}

export async function startServiceJob(id: string): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/start`, {
    method: "POST",
  });
}

export async function completeServiceJob(id: string): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/complete`, {
    method: "POST",
  });
}

export async function cancelServiceJob(id: string): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/cancel`, {
    method: "POST",
  });
}

export async function assignServiceTechnician(
  id: string,
  payload: AssignServiceTechnicianPayload,
): Promise<ServiceJob> {
  return apiFetch<ServiceJob>(`/service-repair/jobs/${id}/technician`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getServiceJobTechnicians(
  id: string,
): Promise<ServiceJobTechnician[]> {
  return apiFetch<ServiceJobTechnician[]>(
    `/service-repair/jobs/${id}/technicians`,
  );
}
