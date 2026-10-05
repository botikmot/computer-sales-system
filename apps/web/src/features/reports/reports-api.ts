import { apiFetch } from "@/lib/api/client";

/* =========================================================
 * Query Types
 * ======================================================= */

export type AccountsPayableReportQuery = {
  branchId?: string;
  supplierId?: string;
  from?: string;
  to?: string;
  asOfDate?: string;
};

export type AccountsReceivableReportQuery = {
  branchId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  asOfDate?: string;
};

export type CashBankReportQuery = {
  branchId?: string;
  accountId?: string;
  date?: string;
  from?: string;
  to?: string;
};

export type InventoryReportQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "productName" | "sku" | "quantity" | "averageCost" | "updatedAt";
  sortOrder?: "asc" | "desc";
  branchId?: string;
  productId?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  threshold?: number;
};

export type ManagementReportQuery = {
  branchId?: string;
  from?: string;
  to?: string;
  asOfDate?: string;
};

export type PettyCashReportQuery = {
  branchId?: string;
  fundId?: string;
  from?: string;
  to?: string;
};

export type PurchasingReportQuery = {
  branchId?: string;
  supplierId?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type SalesReportQuery = {
  branchId?: string;
  customerId?: string;
  productId?: string;
  salespersonId?: string;
  date?: string;
  year?: number;
  month?: number;
  from?: string;
  to?: string;
};

export type ServiceReportQuery = {
  branchId?: string;
  customerId?: string;
  technicianId?: string;
  productId?: string;
  from?: string;
  to?: string;
};

/* =========================================================
 * Generic Helpers
 * ======================================================= */

type QueryValue = string | number | undefined;

function buildQuery(values: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

async function getReport<T>(
  path: string,
  query: Record<string, QueryValue> = {},
): Promise<T> {
  return apiFetch<T>(`${path}${buildQuery(query)}`);
}

/* =========================================================
 * Common Report Types
 * ======================================================= */

export type ReportRecord = Record<string, unknown>;

export type CountTotalReport<T = ReportRecord> = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  items?: T[];
};

export type TransactionsReport<T = ReportRecord> = {
  from: string | null;
  to: string | null;
  count: number;
  total?: string | number;
  totalIn?: string | number;
  totalOut?: string | number;
  net?: string | number;
  transactions: T[];
};

/* =========================================================
 * Accounts Payable
 * ======================================================= */

export type AccountsPayableSupplierBalancesResponse = {
  count: number;
  suppliers: ReportRecord[];
};

export type AccountsPayableOutstandingResponse = {
  count: number;
  total: string | number;
  records: ReportRecord[];
};

export type AccountsPayableDueOverdueResponse = {
  asOfDate: string;
  due: {
    count: number;
    total: string | number;
    records: ReportRecord[];
  };
  overdue: {
    count: number;
    total: string | number;
    records: ReportRecord[];
  };
  noDueDate: {
    count: number;
    total: string | number;
    records: ReportRecord[];
  };
};

export type AccountsPayablePaymentHistoryResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  payments: ReportRecord[];
};

export async function getAccountsPayableSupplierBalances(
  query: AccountsPayableReportQuery = {},
): Promise<AccountsPayableSupplierBalancesResponse> {
  return getReport("/reports/accounts-payable/supplier-balances", query);
}

export async function getAccountsPayableOutstanding(
  query: AccountsPayableReportQuery = {},
): Promise<AccountsPayableOutstandingResponse> {
  return getReport("/reports/accounts-payable/outstanding", query);
}

export async function getAccountsPayableDueOverdue(
  query: AccountsPayableReportQuery = {},
): Promise<AccountsPayableDueOverdueResponse> {
  return getReport("/reports/accounts-payable/due-overdue", query);
}

export async function getAccountsPayablePaymentHistory(
  query: AccountsPayableReportQuery = {},
): Promise<AccountsPayablePaymentHistoryResponse> {
  return getReport("/reports/accounts-payable/payment-history", query);
}

/* =========================================================
 * Accounts Receivable
 * ======================================================= */

export type AccountsReceivableCustomerBalancesResponse = {
  count: number;
  customers: ReportRecord[];
};

export type AccountsReceivableOutstandingResponse = {
  count: number;
  total: string | number;
  records: ReportRecord[];
};

export type AccountsReceivableAgingResponse = {
  asOfDate: string;
  totalOutstanding: string | number;
  summary: {
    current: string | number;
    days1To30: string | number;
    days31To60: string | number;
    days61To90: string | number;
    days91Plus: string | number;
    noDueDate: string | number;
  };
  count: number;
  items: ReportRecord[];
};

export type AccountsReceivableCollectionsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  collections: ReportRecord[];
};

export async function getAccountsReceivableCustomerBalances(
  query: AccountsReceivableReportQuery = {},
): Promise<AccountsReceivableCustomerBalancesResponse> {
  return getReport("/reports/accounts-receivable/customer-balances", query);
}

export async function getAccountsReceivableOutstanding(
  query: AccountsReceivableReportQuery = {},
): Promise<AccountsReceivableOutstandingResponse> {
  return getReport("/reports/accounts-receivable/outstanding", query);
}

export async function getAccountsReceivableAging(
  query: AccountsReceivableReportQuery = {},
): Promise<AccountsReceivableAgingResponse> {
  return getReport("/reports/accounts-receivable/aging", query);
}

export async function getAccountsReceivableCollections(
  query: AccountsReceivableReportQuery = {},
): Promise<AccountsReceivableCollectionsResponse> {
  return getReport("/reports/accounts-receivable/collections", query);
}

/* =========================================================
 * Cash / Bank
 * ======================================================= */

export type DailyCashReportResponse = {
  date: string;
  openingBalance: string | number;
  cashReceipts: string | number;
  cashDisbursements: string | number;
  closingBalance: string | number;
  accounts: ReportRecord[];
};

export type CashReceiptsResponse = {
  from: string;
  to: string;
  count: number;
  total: string | number;
  transactions: ReportRecord[];
};

export type CashDisbursementsResponse = {
  from: string;
  to: string;
  count: number;
  total: string | number;
  transactions: ReportRecord[];
};

export type BankTransactionsResponse = {
  from: string;
  to: string;
  count: number;
  totalIn: string | number;
  totalOut: string | number;
  net: string | number;
  transactions: ReportRecord[];
};

export type BankReconciliationResponse = ReportRecord[];

export async function getDailyCashReport(
  query: CashBankReportQuery = {},
): Promise<DailyCashReportResponse> {
  return getReport("/reports/cash-bank/daily", query);
}

export async function getCashReceipts(
  query: CashBankReportQuery = {},
): Promise<CashReceiptsResponse> {
  return getReport("/reports/cash-bank/receipts", query);
}

export async function getCashDisbursements(
  query: CashBankReportQuery = {},
): Promise<CashDisbursementsResponse> {
  return getReport("/reports/cash-bank/disbursements", query);
}

export async function getBankTransactions(
  query: CashBankReportQuery = {},
): Promise<BankTransactionsResponse> {
  return getReport("/reports/cash-bank/transactions", query);
}

export async function getBankReconciliation(
  query: CashBankReportQuery = {},
): Promise<BankReconciliationResponse> {
  return getReport("/reports/cash-bank/reconciliation", query);
}

/* =========================================================
 * Inventory
 * ======================================================= */

export type InventoryStockResponse = {
  count: number;
  totalQuantity: number;
  totalValue: string | number;

  items: {
    branchId: string;
    branchCode: string;
    branchName: string;

    productId: string;

    sku: string;
    productName: string;
    category?: string | null;
    unit: string;

    quantity: number;
    averageCost: string | number;
    inventoryValue: string | number;

    updatedAt: string;
  }[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type InventoryStockCardResponse = {
  from: string | null;
  to: string | null;
  productId: string | null;

  count: number;
  totalIn: number;
  totalOut: number;
  netQuantityChange: number;

  movements: {
    id: string;
    date: string;

    productId: string;
    sku: string;
    productName: string;

    type: string;

    quantityChange: number;
    balanceAfter: number;

    unitCost: string | number;
    totalCost: string | number;
    averageCostAfter: string | number;

    referenceType?: string | null;
    referenceId?: string | null;
    notes?: string | null;
  }[];
};

export type InventoryValuationResponse = {
  count: number;
  totalQuantity: number;
  totalValue: string | number;
  items: {
    branchId: string;
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    averageCost: string | number;
    inventoryValue: string | number;
  }[];
};

export type InventoryLowStockResponse = {
  threshold: number;
  count: number;
  items: {
    branchId: string;
    productId: string;
    sku: string;
    productName: string;
    category: string | null;
    quantity: number;
    averageCost: string | number;
    inventoryValue: string | number;
  }[];
};

export type InventoryMovementResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalIn: number;
  totalOut: number;
  netQuantityChange: number;
  totalCost: string | number;
  movements: {
    id: string;
    createdAt: string;
    branchId: string;
    productId: string;
    sku: string;
    productName: string;
    type: string;
    quantityChange: number;
    balanceAfter: number;
    unitCost: string | number | null;
    totalCost: string | number | null;
    averageCostAfter: string | number | null;
    referenceType?: string | null;
    referenceId?: string | null;
    notes?: string | null;
  }[];
};

export type InventoryAdjustmentsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalIncrease: number;
  totalDecrease: number;

  adjustments: {
    id: string;
    adjustmentNo: string;
    branchId: string;
    status: string;
    adjustmentDate: string;
    notes: string | null;

    createdById: string | null;
    approvedById: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;

    createdAt: string;
    updatedAt: string;

    branch: {
      id: string;
      code: string;
      name: string;
    };

    items: {
      id: string;
      adjustmentId: string;
      productId: string;
      systemQuantity: number;
      countedQuantity: number;
      difference: number;
      unitCost: string | number;
      totalCost: string | number;
      reason: string | null;
      notes: string | null;
      createdAt: string;
      updatedAt: string;

      product: {
        id: string;
        sku: string | null;
        name: string;
      };
    }[];
  }[];
};

export async function getInventoryStock(
  query: InventoryReportQuery = {},
): Promise<InventoryStockResponse> {
  return getReport("/reports/inventory/stock", query);
}

export async function getInventoryStockCard(
  query: InventoryReportQuery = {},
): Promise<InventoryStockCardResponse> {
  return getReport("/reports/inventory/stock-card", query);
}

export async function getInventoryValuation(
  query: InventoryReportQuery = {},
): Promise<InventoryValuationResponse> {
  return getReport("/reports/inventory/valuation", query);
}

export async function getInventoryLowStock(
  query: InventoryReportQuery = {},
): Promise<InventoryLowStockResponse> {
  return getReport("/reports/inventory/low-stock", query);
}

export async function getInventoryMovement(
  query: InventoryReportQuery = {},
): Promise<InventoryMovementResponse> {
  return getReport("/reports/inventory/movement", query);
}

export async function getInventoryAdjustments(
  query: InventoryReportQuery = {},
): Promise<InventoryAdjustmentsResponse> {
  return getReport("/reports/inventory/adjustments", query);
}

/* =========================================================
 * Management / Financial
 * ======================================================= */

export type IncomeStatementResponse = ReportRecord;

export type BalanceSheetResponse = ReportRecord;

export type CashFlowResponse = ReportRecord;

export type SalesProfitabilityResponse = ReportRecord;

export type ManagementInventoryValuationResponse = ReportRecord;

export type ArApAgingResponse = ReportRecord;

export async function getIncomeStatement(
  query: ManagementReportQuery = {},
): Promise<IncomeStatementResponse> {
  return getReport("/reports/management/income-statement", query);
}

export async function getBalanceSheet(
  query: ManagementReportQuery = {},
): Promise<BalanceSheetResponse> {
  return getReport("/reports/management/balance-sheet", query);
}

export async function getCashFlow(
  query: ManagementReportQuery = {},
): Promise<CashFlowResponse> {
  return getReport("/reports/management/cash-flow", query);
}

export async function getSalesProfitability(
  query: ManagementReportQuery = {},
): Promise<SalesProfitabilityResponse> {
  return getReport("/reports/management/sales-profitability", query);
}

export async function getManagementInventoryValuation(
  query: ManagementReportQuery = {},
): Promise<ManagementInventoryValuationResponse> {
  return getReport("/reports/management/inventory-valuation", query);
}

export async function getArApAging(
  query: ManagementReportQuery = {},
): Promise<ArApAgingResponse> {
  return getReport("/reports/management/ar-ap-aging", query);
}

/* =========================================================
 * Petty Cash
 * ======================================================= */

export type PettyCashTransactionsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalIn: string | number;
  totalOut: string | number;
  net: string | number;
  transactions: ReportRecord[];
};

export type PettyCashVouchersResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  vouchers: ReportRecord[];
};

export type PettyCashReplenishmentsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  replenishments: ReportRecord[];
};

export type PettyCashBalanceResponse = {
  count: number;
  funds: ReportRecord[];
};

export async function getPettyCashTransactions(
  query: PettyCashReportQuery = {},
): Promise<PettyCashTransactionsResponse> {
  return getReport("/reports/petty-cash/transactions", query);
}

export async function getPettyCashVouchers(
  query: PettyCashReportQuery = {},
): Promise<PettyCashVouchersResponse> {
  return getReport("/reports/petty-cash/vouchers", query);
}

export async function getPettyCashReplenishments(
  query: PettyCashReportQuery = {},
): Promise<PettyCashReplenishmentsResponse> {
  return getReport("/reports/petty-cash/replenishments", query);
}

export async function getPettyCashBalance(
  query: PettyCashReportQuery = {},
): Promise<PettyCashBalanceResponse> {
  return getReport("/reports/petty-cash/balance", query);
}

/* =========================================================
 * Purchasing
 * ======================================================= */

export type PurchaseOrderReportResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  purchaseOrders: {
    id: string;
    poNumber: string;
    branchId: string;
    supplierId: string;
    purchaseRequestId?: string | null;
    supplierQuotationId?: string | null;
    status:
      | "DRAFT"
      | "APPROVED"
      | "SENT"
      | "PARTIALLY_RECEIVED"
      | "RECEIVED"
      | "CLOSED"
      | "CANCELLED";
    orderDate: string;
    expectedDate?: string | null;
    notes?: string | null;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    total: string | number;

    supplier: {
      id: string;
      code: string;
      name: string;
    };

    branch: {
      id: string;
      code: string;
      name: string;
    };

    items: {
      id: string;
      productId: string;
      quantity: number;
      unitCost: string | number;
      subtotal: string | number;
      receivedQuantity: number;
      product: {
        id: string;
        sku: string;
        name: string;
      };
    }[];
  }[];
};

export type PurchasesBySupplierResponse = {
  from: string | null;
  to: string | null;
  count: number;
  grandTotal: string | number;

  suppliers: {
    supplier: {
      id: string;
      code: string;
      name: string;
      contactPerson?: string | null;
      contactNumber?: string | null;
      email?: string | null;
      address?: string | null;
      taxId?: string | null;
      isActive: boolean;
    };

    invoiceCount: number;
    subtotal: string | number;
    total: string | number;
  }[];
};

export type PurchasesByDateResponse = {
  from: string | null;
  to: string | null;
  count: number;
  grandTotal: string | number;

  dates: {
    date: string;
    invoiceCount: number;
    total: string | number;
  }[];
};

export type OutstandingPurchaseOrdersResponse = {
  from: string | null;
  to: string | null;
  count: number;
  outstandingTotal: string | number;
  purchaseOrders: {
    id: string;
    poNumber: string;
    branchId: string;
    supplierId: string;
    status:
      | "DRAFT"
      | "APPROVED"
      | "SENT"
      | "PARTIALLY_RECEIVED"
      | "RECEIVED"
      | "CLOSED"
      | "CANCELLED";
    orderDate: string;
    expectedDate?: string | null;
    notes?: string | null;

    supplier: {
      id: string;
      code: string;
      name: string;
    };

    branch: {
      id: string;
      code: string;
      name: string;
    };

    items: {
      id: string;
      productId: string;
      quantity: number;
      receivedQuantity: number;
      remainingQuantity: number;
      unitCost: string | number;
      outstandingAmount: string | number;

      product: {
        id: string;
        sku: string;
        name: string;
      };
    }[];

    outstandingTotal: string | number;
  }[];
};

export async function getPurchaseOrderReport(
  query: PurchasingReportQuery = {},
): Promise<PurchaseOrderReportResponse> {
  return getReport("/reports/purchasing/purchase-orders", query);
}

export async function getPurchasesBySupplier(
  query: PurchasingReportQuery = {},
): Promise<PurchasesBySupplierResponse> {
  return getReport("/reports/purchasing/by-supplier", query);
}

export async function getPurchasesByDate(
  query: PurchasingReportQuery = {},
): Promise<PurchasesByDateResponse> {
  return getReport("/reports/purchasing/by-date", query);
}

export async function getOutstandingPurchaseOrders(
  query: PurchasingReportQuery = {},
): Promise<OutstandingPurchaseOrdersResponse> {
  return getReport("/reports/purchasing/outstanding", query);
}

/* =========================================================
 * Sales
 * ======================================================= */

export type DailySalesResponse = {
  date: string;
  count: number;
  totalSales: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  invoices: ReportRecord[];
};

export type MonthlySalesResponse = {
  year: number;
  month: number;
  from: string;
  to: string;
  count: number;
  totalSales: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  invoices: ReportRecord[];
};

export type SalesByCustomerResponse = {
  from: string;
  to: string;
  count: number;
  customers: {
    customer: {
      id: string;
      code: string;
      name: string;
      contactNumber?: string | null;
      email?: string | null;
      address?: string | null;
      taxId?: string | null;
      isActive: boolean;
    };
    invoiceCount: number;
    totalSales: string | number;
    amountPaid: string | number;
    balanceDue: string | number;
  }[];
};

export type SalesByProductResponse = {
  from: string;
  to: string;
  count: number;
  products: {
    product: {
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
    quantity: number;
    invoiceCount: number;
    totalSales: string | number;
  }[];
};

export type SalesBySalespersonResponse = {
  from: string;
  to: string;
  count: number;
  salespeople: {
    salesperson: {
      id: string;
      username: string;
      email: string;
      fullName: string;
      role: string;
      status: string;
      branchId: string | null;
    };
    invoiceCount: number;
    totalSales: string | number;
    amountPaid: string | number;
    balanceDue: string | number;
  }[];
};

export type SalesReturnsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalReturns: string | number;
  bySettlementMode: {
    cashRefund: string | number;
    arAdjustment: string | number;
    noRefund: string | number;
  };
  returns: {
    id: string;
    returnNo: string;
    branchId: string;
    customerId: string;
    salesInvoiceId: string;
    status: string;
    settlementMode: "CASH_REFUND" | "AR_ADJUSTMENT" | "NO_REFUND";
    returnDate: string;
    subtotal: string | number;
    total: string | number;
    reason?: string | null;
    notes?: string | null;
    branch: {
      id: string;
      code: string;
      name: string;
    };
    customer: {
      id: string;
      code: string;
      name: string;
    };
    salesInvoice: {
      id: string;
      invoiceNo: string;
      invoiceDate: string;
      paymentMode: string;
      total: string | number;
    };
  }[];
};

export async function getDailySales(
  query: SalesReportQuery = {},
): Promise<DailySalesResponse> {
  return getReport("/reports/sales/daily", query);
}

export async function getMonthlySales(
  query: SalesReportQuery = {},
): Promise<MonthlySalesResponse> {
  return getReport("/reports/sales/monthly", query);
}

export async function getSalesByCustomer(
  query: SalesReportQuery = {},
): Promise<SalesByCustomerResponse> {
  return getReport("/reports/sales/by-customer", query);
}

export async function getSalesByProduct(
  query: SalesReportQuery = {},
): Promise<SalesByProductResponse> {
  return getReport("/reports/sales/by-product", query);
}

export async function getSalesBySalesperson(
  query: SalesReportQuery = {},
): Promise<SalesBySalespersonResponse> {
  return getReport("/reports/sales/by-salesperson", query);
}

export async function getSalesReturns(
  query: SalesReportQuery = {},
): Promise<SalesReturnsResponse> {
  return getReport("/reports/sales/returns", query);
}

/* =========================================================
 * Service / Repair
 * ======================================================= */

export type OpenServiceJobsResponse = ReportRecord;

export type CompletedRepairsResponse = ReportRecord;

export type PendingRepairsResponse = ReportRecord;

export type ServicePartsUsedResponse = ReportRecord;

export type ServiceRevenueResponse = ReportRecord;

export type TechnicianPerformanceResponse = ReportRecord;

export async function getOpenServiceJobs(
  query: ServiceReportQuery = {},
): Promise<OpenServiceJobsResponse> {
  return getReport("/reports/service/open-jobs", query);
}

export async function getCompletedRepairs(
  query: ServiceReportQuery = {},
): Promise<CompletedRepairsResponse> {
  return getReport("/reports/service/completed-repairs", query);
}

export async function getPendingRepairs(
  query: ServiceReportQuery = {},
): Promise<PendingRepairsResponse> {
  return getReport("/reports/service/pending-repairs", query);
}

export async function getServicePartsUsed(
  query: ServiceReportQuery = {},
): Promise<ServicePartsUsedResponse> {
  return getReport("/reports/service/parts-used", query);
}

export async function getServiceRevenue(
  query: ServiceReportQuery = {},
): Promise<ServiceRevenueResponse> {
  return getReport("/reports/service/revenue", query);
}

export async function getTechnicianPerformance(
  query: ServiceReportQuery = {},
): Promise<TechnicianPerformanceResponse> {
  return getReport("/reports/service/technician-performance", query);
}
