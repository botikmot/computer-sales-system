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
  page?: number;
  limit?: number;
};

export type AccountsReceivableReportQuery = {
  branchId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  asOfDate?: string;
  page?: number;
  limit?: number;
};

export type CashBankReportQuery = {
  branchId?: string;
  accountId?: string;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
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
  page?: number;
  limit?: number;
  arPage?: number;
  apPage?: number;
};

export type PettyCashReportQuery = {
  branchId?: string;
  fundId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
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
  page?: number;
  limit?: number;
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

export type AccountsPayableSupplierBalanceRow = {
  supplier: ReportRecord & {
    id: string;
    code?: string | null;
    name: string;
    isActive?: boolean;
  };
  payableCount: number;
  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
};

export type AccountsPayableSupplierBalancesResponse = {
  count: number;
  suppliers: AccountsPayableSupplierBalanceRow[];

  totals: {
    supplierCount: number;
    payableCount: number;
    originalAmount: string | number;
    amountPaid: string | number;
    balanceDue: string | number;
  };

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsPayableOutstandingRecord = {
  id: string;
  status: string;
  paymentMode: string;

  dueDate: string | null;
  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;

  supplier: {
    id: string;
    code: string;
    name: string;
  };

  purchaseInvoice: {
    id: string;
    invoiceNo: string;
    supplierInvoiceNo: string | null;
    invoiceDate: string;
    total: string | number;
  };

  payments?: ReportRecord[];
};

export type AccountsPayableOutstandingResponse = {
  count: number;
  total: string | number;
  records: AccountsPayableOutstandingRecord[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsPayablePayablesBucket = {
  count: number;
  total: string | number;
  records: AccountsPayableOutstandingRecord[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsPayableDueOverdueResponse = {
  asOfDate: string;
  overdue: AccountsPayablePayablesBucket;
  due: AccountsPayablePayablesBucket;
  noDueDate: AccountsPayablePayablesBucket;
};

export type AccountsPayablePaymentHistoryRecord = {
  id: string;
  paymentNo: string;
  paymentDate: string;
  amount: string | number;
  status: string;
  accountType: string;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;

  supplier: {
    id: string;
    code: string;
    name: string;
  };

  accountsPayable: {
    id: string;
    originalAmount: string | number;
    amountPaid: string | number;
    balanceDue: string | number;

    purchaseInvoice: {
      id: string;
      invoiceNo: string;
      supplierInvoiceNo: string | null;
      invoiceDate: string;
      total: string | number;
    };
  };

  account: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string;
  };

  cashBankTransaction: {
    id: string;
    accountName: string;
    transactionDate: string;
    referenceNo: string | null;
    amount: string | number;
  } | null;

  paymentVoucher: {
    id: string;
    voucherNo: string;
    voucherDate: string;
    payeeName: string;
    amount: string | number;
    purpose: string | null;
  } | null;
};

export type AccountsPayablePaymentHistoryResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;

  payments: AccountsPayablePaymentHistoryRecord[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export type AccountsReceivableCustomerBalanceRow = {
  customer: ReportRecord & {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };

  invoiceCount: number;
  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
};

export type AccountsReceivableCustomerBalancesResponse = {
  count: number;
  customers: AccountsReceivableCustomerBalanceRow[];

  totals: {
    customerCount: number;
    receivableCount: number;
    originalAmount: string | number;
    amountPaid: string | number;
    balanceDue: string | number;
  };

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsReceivableOutstandingRow = ReportRecord & {
  id: string;
  customer: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
  salesInvoice?:
    | (ReportRecord & {
        invoiceNo: string;
      })
    | null;
  serviceInvoice?:
    | (ReportRecord & {
        invoiceNo: string;
      })
    | null;
  originalAmount: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  dueDate: string | null;
  status: string;
  createdAt?: string;
};

export type AccountsReceivableOutstandingResponse = {
  count: number;
  total: string | number;
  records: AccountsReceivableOutstandingRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsReceivableAgingBucket =
  "CURRENT" | "1_30" | "31_60" | "61_90" | "91_PLUS" | "NO_DUE_DATE";

export type AccountsReceivableAgingRow = ReportRecord & {
  id: string;
  customer: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
  salesInvoice?:
    | (ReportRecord & {
        invoiceNo: string;
      })
    | null;
  serviceInvoice?:
    | (ReportRecord & {
        invoiceNo: string;
      })
    | null;
  dueDate: string | null;
  balanceDue: string | number;
  status: string;
  agingBucket: AccountsReceivableAgingBucket;
  overdueDays: number;
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
  items: AccountsReceivableAgingRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AccountsReceivableCollectionRow = ReportRecord & {
  id: string;
  paymentNo: string;
  amount: string | number;
  paymentDate: string;
  referenceNo?: string | null;
  notes?: string | null;
  status: string;
  customer: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
  branch?: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
  salesInvoice?:
    | (ReportRecord & {
        id: string;
        invoiceNo: string;
      })
    | null;
  serviceInvoice?:
    | (ReportRecord & {
        id: string;
        invoiceNo: string;
      })
    | null;
  account: ReportRecord & {
    id: string;
    name: string;
    accountType: string;
  };
};

export type AccountsReceivableCollectionsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  collections: AccountsReceivableCollectionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export type DailyCashAccountRow = {
  id: string;
  branchId: string;
  name: string;
  accountNumber: string | null;
  branch: {
    id: string;
    code: string;
    name: string;
  };
  configuredOpeningBalance: string | number;
  openingBalance: string | number;
  cashReceipts: string | number;
  cashDisbursements: string | number;
  closingBalance: string | number;
};

export type DailyCashReportResponse = {
  date: string;
  openingBalance: string | number;
  cashReceipts: string | number;
  cashDisbursements: string | number;
  closingBalance: string | number;
  count: number;
  accounts: DailyCashAccountRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CashReceiptTransactionRow = ReportRecord & {
  id: string;
  accountName: string;
  accountType: string;
  transactionType: string;
  direction: string;
  amount: string | number;
  transactionDate: string;
  referenceNo?: string | null;
  notes?: string | null;
  account: ReportRecord & {
    id: string;
    name: string;
    accountType: string;
    accountNumber?: string | null;
  };
  branch: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
};

export type CashReceiptsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  transactions: CashReceiptTransactionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CashDisbursementTransactionRow = ReportRecord & {
  id: string;
  accountName: string;
  accountType: string;
  transactionType: string;
  direction: string;
  amount: string | number;
  transactionDate: string;
  referenceNo?: string | null;
  notes?: string | null;
  account: ReportRecord & {
    id: string;
    name: string;
    accountType: string;
    accountNumber?: string | null;
  };
  branch: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
};

export type CashDisbursementsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  transactions: CashDisbursementTransactionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type BankTransactionReportRow = ReportRecord & {
  id: string;
  accountId: string;
  accountName: string;
  accountType: string;
  transactionType: string;
  direction: string;
  amount: string | number;
  transactionDate: string;
  referenceNo?: string | null;
  notes?: string | null;

  account: ReportRecord & {
    id: string;
    name: string;
    accountType: string;
    accountNumber?: string | null;
  };

  branch: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };
};

export type BankTransactionsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalIn: string | number;
  totalOut: string | number;
  net: string | number;

  transactions: BankTransactionReportRow[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type BankReconciliationItemRow = ReportRecord & {
  id: string;
  type: string;
  amount: string | number;
  referenceNo?: string | null;
  notes?: string | null;
  cashBankTransactionId?: string | null;

  cashBankTransaction?:
    | (ReportRecord & {
        id: string;
        transactionDate: string;
        direction: string;
        transactionType: string;
        amount: string | number;
        accountName: string;
        referenceNo?: string | null;
      })
    | null;
};

export type BankReconciliationRow = ReportRecord & {
  id: string;
  reconciliationNo: string;
  branchId: string;
  accountId: string;
  statementDate: string;

  statementEndingBalance: string | number;
  bookBalance: string | number;
  adjustedBankBalance: string | number;
  adjustedBookBalance: string | number;
  difference: string | number;

  status: string;
  notes?: string | null;

  branch: ReportRecord & {
    id: string;
    code: string;
    name: string;
  };

  account: ReportRecord & {
    id: string;
    name: string;
    accountType: string;
    accountNumber?: string | null;
  };

  items: BankReconciliationItemRow[];
};

export type BankReconciliationResponse = {
  from: string | null;
  to: string | null;
  count: number;

  reconciliations: BankReconciliationRow[];

  statusCounts: {
    status: string;
    count: number;
  }[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

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

type ReportAmount = string | number;

export type IncomeStatementResponse = {
  from: string;
  to: string;

  revenue: {
    sales: ReportAmount;
    salesReturns: ReportAmount;
    netSales: ReportAmount;
    service: ReportAmount;
    total: ReportAmount;
  };

  costOfSales: {
    salesCogs: ReportAmount;
    repairPartsCost: ReportAmount;
    total: ReportAmount;
  };

  grossProfit: ReportAmount;
  grossMargin: ReportAmount;

  operatingExpenses: {
    cashExpenses: ReportAmount;
    pettyCashExpenses: ReportAmount;
    total: ReportAmount;
  };

  estimatedNetIncome: ReportAmount;
};

type ManagementReportAmount = string | number;

export type BalanceSheetAccountBalance = {
  id: string;
  name: string;
  accountType: string;
  openingBalance: ManagementReportAmount;
  transactionNet: ManagementReportAmount;
  balance: ManagementReportAmount;
};

export type BalanceSheetResponse = {
  asOfDate: string;
  assets: {
    cashAndBank: ManagementReportAmount;
    accountsReceivable: ManagementReportAmount;
    inventory: ManagementReportAmount;
    total: ManagementReportAmount;
  };
  liabilities: {
    accountsPayable: ManagementReportAmount;
    total: ManagementReportAmount;
  };
  derivedEquity: ManagementReportAmount;
  accounts: BalanceSheetAccountBalance[];
  inventoryCount: number;
  receivableCount: number;
  payableCount: number;
};

type CashFlowAmount = string | number;

export type CashFlowResponse = {
  from: string;
  to: string;
  inflows: {
    customerCollections: CashFlowAmount;
    otherReceipts: CashFlowAmount;
    total: CashFlowAmount;
  };
  outflows: {
    supplierPayments: CashFlowAmount;
    operatingExpenses: CashFlowAmount;
    customerRefunds: CashFlowAmount;
    pettyCashExpenses: CashFlowAmount;
    total: CashFlowAmount;
  };
  netCashFlow: CashFlowAmount;
  transactionCount: number;
  pettyCashExpenseCount: number;
};

type SalesProfitabilityAmount = string | number;

export type SalesProfitabilityResponse = {
  from: string;
  to: string;
  revenue: {
    sales: SalesProfitabilityAmount;
    salesReturns: SalesProfitabilityAmount;
    netSales: SalesProfitabilityAmount;
    service: SalesProfitabilityAmount;
    total: SalesProfitabilityAmount;
  };
  costOfSales: {
    salesCogs: SalesProfitabilityAmount;
    repairPartsCost: SalesProfitabilityAmount;
    total: SalesProfitabilityAmount;
  };
  grossProfit: SalesProfitabilityAmount;
  grossMargin: SalesProfitabilityAmount;
  operatingExpenses: {
    cashExpenses: SalesProfitabilityAmount;
    pettyCashExpenses: SalesProfitabilityAmount;
    total: SalesProfitabilityAmount;
  };
  estimatedNetProfit: SalesProfitabilityAmount;
};

type ManagementInventoryValuationAmount = string | number;

export type ManagementInventoryValuationResponse = {
  asOfDate: string;
  count: number;
  totalQuantity: number;
  totalValue: ManagementInventoryValuationAmount;
  items: {
    branchId: string;
    branchName: string;
    productId: string;
    sku: string | null;
    productName: string;
    quantity: number;
    averageCost: ManagementInventoryValuationAmount;
    inventoryValue: ManagementInventoryValuationAmount;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type ManagementAgingAmount = string | number;

export type ManagementAgingBucketValues = {
  current: ManagementAgingAmount;
  "1_30": ManagementAgingAmount;
  "31_60": ManagementAgingAmount;
  "61_90": ManagementAgingAmount;
  "91_plus": ManagementAgingAmount;
  noDueDate: ManagementAgingAmount;
};

export type ManagementAgingParty = {
  id: string;
  code?: string | null;
  name: string;
};

export type ManagementAgingRecord = {
  id: string;
  status: string;
  dueDate: string | null;
  originalAmount: ManagementAgingAmount;
  amountPaid: ManagementAgingAmount;
  balanceDue: ManagementAgingAmount;
  customer?: ManagementAgingParty;
  supplier?: ManagementAgingParty;
};

export type ManagementAgingPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ManagementAgingSection = {
  count: number;
  total: ManagementAgingAmount;
  aging: ManagementAgingBucketValues;
  records: ManagementAgingRecord[];
  pagination: ManagementAgingPagination;
};

export type ArApAgingResponse = {
  asOfDate: string;
  accountsReceivable: ManagementAgingSection;
  accountsPayable: ManagementAgingSection;
};

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

export type PettyCashTransactionReportRow = {
  id: string;
  type: "VOUCHER" | "REPLENISHMENT";
  referenceNo: string;
  date: string;
  description: string;
  category: string;
  payee: string | null;
  amount: string | number;
  direction: "IN" | "OUT";
  fundId: string;
  fundNo: string;
  fundName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  sourceReferenceNo: string | null;
};

export type PettyCashTransactionsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalIn: string | number;
  totalOut: string | number;
  net: string | number;
  transactions: PettyCashTransactionReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PettyCashVoucherReportRow = {
  id: string;
  voucherNo: string;
  fundId: string;
  expenseDate: string;
  description: string;
  amount: string | number;
  category: string;
  payee?: string | null;
  referenceNo?: string | null;
  status: string;

  fund: {
    id: string;
    fundNo: string;
    name: string;
    branchId: string;
    branch: {
      id: string;
      code: string;
      name: string;
    };
  };
};

export type PettyCashVouchersResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  vouchers: PettyCashVoucherReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PettyCashReplenishmentsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  total: string | number;
  replenishments: ReportRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PettyCashBalanceResponse = {
  count: number;

  funds: ReportRecord[];

  summary: {
    openingBalance: string | number;
    currentBalance: string | number;
    totalExpenses: string | number;
    totalReplenishments: string | number;
  };

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export type OpenServiceJobReportItem = {
  id: string;
  jobNo: string;
  branchId: string;
  customerId: string;
  technicianId: string | null;
  status: string;
  laborCharge: string | number;
  customerApproved: boolean;
  customerApprovedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

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

  technician: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;

  parts: {
    id: string;
    requiredQuantity: number;
    issuedQuantity: number;
    product: {
      id: string;
      sku: string | null;
      name: string;
    };
  }[];

  invoice: {
    id: string;
    invoiceNo: string;
    status: string;
    total: string | number;
  } | null;
};

export type OpenServiceJobsResponse = {
  from: string | null;
  to: string | null;
  count: number;
  jobs: OpenServiceJobReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CompletedRepairsResponse = OpenServiceJobsResponse;

export type PendingRepairsResponse = OpenServiceJobsResponse;

export type ServicePartUsedReportItem = {
  id: string;
  serviceJobId: string;
  productId: string;
  requiredQuantity: number;
  issuedQuantity: number;
  unitCost: string | number;
  totalCost: string | number;
  notes: string | null;

  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };

  serviceJob: {
    id: string;
    jobNo: string;
    branchId: string;
    customerId: string;
    technicianId: string | null;
    status: string;
    createdAt: string;

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

    technician: {
      id: string;
      username: string;
      fullName: string;
    } | null;
  };
};

export type ServicePartsUsedResponse = {
  from: string | null;
  to: string | null;
  count: number;
  totalQuantity: number;
  totalCost: string | number;
  parts: ServicePartUsedReportItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ServiceRevenueInvoiceItem = {
  id: string;
  itemType: "LABOR" | "PART" | "OTHER";
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  subtotal: string | number;
};

export type ServiceRevenueInvoice = {
  id: string;
  invoiceNo: string;
  status: string;
  paymentMode: string;
  invoiceDate: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;

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

  serviceJob: {
    id: string;
    jobNo: string;
    technician: {
      id: string;
      username: string;
      fullName: string;
    } | null;
  };

  items: ServiceRevenueInvoiceItem[];
};

export type ServiceRevenueResponse = {
  from: string | null;
  to: string | null;
  invoiceCount: number;
  totalRevenue: string | number;
  laborRevenue: string | number;
  partsRevenue: string | number;
  otherRevenue: string | number;
  invoices: ServiceRevenueInvoice[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type TechnicianPerformanceRow = {
  technician: {
    id: string;
    username: string;
    email: string | null;
    fullName: string;
    role: string;
    status: string;
    branchId: string | null;
  };

  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  cancelledJobs: number;
  completionRate: number;
  serviceRevenue: string | number;
};

export type TechnicianPerformanceResponse = {
  from: string | null;
  to: string | null;
  count: number;

  totals: {
    totalTechnicians: number;
    totalJobs: number;
    completedJobs: number;
    activeJobs: number;
    cancelledJobs: number;
    serviceRevenue: string | number;
    completionRate: number;
  };

  technicians: TechnicianPerformanceRow[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

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
