import { apiFetch } from "@/lib/api/client";

import type { Product } from "@/features/products/products-api";

export type BomQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "finishedProduct" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type BomListResponse = {
  items: BillOfMaterial[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AssemblyBranch = {
  id: string;
  code?: string;
  name: string;
};

export type BillOfMaterialItem = {
  id: string;
  billOfMaterialId: string;
  componentProductId: string;
  quantity: number;
  componentProduct: Product;
};

export type BillOfMaterial = {
  id: string;
  productId: string;
  name?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  product: Product;
  items: BillOfMaterialItem[];
};

export type AssemblyComponent = {
  id: string;
  assemblyId: string;
  componentProductId: string;
  quantityConsumed: number;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  componentProduct: Product;
};

export type AssemblyInventoryMovement = {
  id: string;
  type: string;
  quantityChange: number;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  balanceAfter?: number | null;
  createdAt: string;
};

export type Assembly = {
  id: string;
  branchId: string;
  billOfMaterialId: string;
  finishedProductId: string;
  quantityProduced: number;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;

  branch?: AssemblyBranch;

  billOfMaterial: BillOfMaterial;

  finishedProduct: Product;

  components: AssemblyComponent[];

  inventoryMovements?: AssemblyInventoryMovement[];
};

export type AssemblyQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "finishedProduct" | "quantityProduced" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type AssemblyListResponse = {
  items: Assembly[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CreateBomItemPayload = {
  componentProductId: string;
  quantity: number;
};

export type CreateBomPayload = {
  finishedProductId: string;
  items: CreateBomItemPayload[];
};

export type CreateAssemblyPayload = {
  branchId: string;
  billOfMaterialId: string;
  quantityProduced: number;
  notes?: string;
};

export async function getAssemblies(
  query: AssemblyQuery = {},
): Promise<AssemblyListResponse> {
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

  return apiFetch<AssemblyListResponse>(`/assemblies?${params.toString()}`);
}

export async function getAssembly(id: string): Promise<Assembly> {
  return apiFetch<Assembly>(`/assemblies/${id}`);
}

export async function getBillOfMaterials(
  query: BomQuery = {},
): Promise<BomListResponse> {
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

  return apiFetch<BomListResponse>(`/assemblies/bom?${params.toString()}`);
}

export async function getBillOfMaterial(id: string): Promise<BillOfMaterial> {
  return apiFetch<BillOfMaterial>(`/assemblies/bom/${id}`);
}

export async function createBillOfMaterial(
  payload: CreateBomPayload,
): Promise<BillOfMaterial> {
  return apiFetch<BillOfMaterial>("/assemblies/bom", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function createAssembly(
  payload: CreateAssemblyPayload,
): Promise<Assembly> {
  return apiFetch<Assembly>("/assemblies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
