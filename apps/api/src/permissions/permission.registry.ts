import { UserRole } from '@computer-sales/database';

export const PERMISSION_REGISTRY = [
  { key: 'dashboard', label: 'Dashboard', group: 'General' },

  { key: 'sales.inquiries', label: 'Inquiries', group: 'Sales' },
  { key: 'sales.quotations', label: 'Quotations', group: 'Sales' },
  { key: 'sales.orders', label: 'Sales Orders', group: 'Sales' },
  { key: 'sales.invoices', label: 'Sales Invoices', group: 'Sales' },
  { key: 'sales.payments', label: 'Customer Payments', group: 'Sales' },
  { key: 'sales.returns', label: 'Sales Returns', group: 'Sales' },

  { key: 'inventory.products', label: 'Products', group: 'Inventory' },
  { key: 'inventory.stock', label: 'Stock', group: 'Inventory' },
  { key: 'inventory.receiving', label: 'Receiving', group: 'Inventory' },
  { key: 'inventory.assembly', label: 'Assembly', group: 'Inventory' },
  {
    key: 'inventory.adjustments',
    label: 'Inventory Adjustments',
    group: 'Inventory',
  },

  { key: 'purchasing.suppliers', label: 'Suppliers', group: 'Purchasing' },
  {
    key: 'purchasing.requests',
    label: 'Purchase Requests',
    group: 'Purchasing',
  },
  {
    key: 'purchasing.quotations',
    label: 'Supplier Quotations',
    group: 'Purchasing',
  },
  { key: 'purchasing.orders', label: 'Purchase Orders', group: 'Purchasing' },
  {
    key: 'purchasing.invoices',
    label: 'Purchase Invoices',
    group: 'Purchasing',
  },
  {
    key: 'purchasing.payments',
    label: 'Supplier Payments',
    group: 'Purchasing',
  },

  { key: 'services.jobs', label: 'Service Jobs', group: 'Services' },
  { key: 'services.invoices', label: 'Service Invoices', group: 'Services' },

  { key: 'finance.ar', label: 'Accounts Receivable', group: 'Finance' },
  { key: 'finance.ap', label: 'Accounts Payable', group: 'Finance' },
  { key: 'finance.cash-bank', label: 'Cash & Bank', group: 'Finance' },
  { key: 'finance.petty-cash', label: 'Petty Cash', group: 'Finance' },

  { key: 'reports', label: 'Reports', group: 'General' },
  { key: 'settings', label: 'Settings', group: 'General' },
] as const;

export type PermissionKey = (typeof PERMISSION_REGISTRY)[number]['key'];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  UserRole,
  readonly PermissionKey[]
> = {
  ADMIN: PERMISSION_REGISTRY.map((permission) => permission.key),

  MANAGER: PERMISSION_REGISTRY.map((permission) => permission.key),

  SALES: [
    'dashboard',
    'sales.inquiries',
    'sales.quotations',
    'sales.orders',
    'sales.invoices',
    'sales.payments',
    'sales.returns',
    'services.invoices',
    'inventory.stock',
    'settings',
  ],

  PURCHASING: [
    'dashboard',
    'purchasing.suppliers',
    'purchasing.requests',
    'purchasing.quotations',
    'purchasing.orders',
    'purchasing.invoices',
    'purchasing.payments',
    'inventory.receiving',
    'settings',
  ],

  INVENTORY: [
    'dashboard',
    'inventory.products',
    'inventory.stock',
    'inventory.receiving',
    'inventory.assembly',
    'inventory.adjustments',
    'settings',
  ],

  TECHNICIAN: ['dashboard', 'services.jobs', 'services.invoices', 'settings'],

  CASHIER: [
    'dashboard',
    'sales.invoices',
    'sales.payments',
    'finance.ar',
    'finance.ap',
    'finance.cash-bank',
    'finance.petty-cash',
    'purchasing.payments',
    'settings',
  ],
};
