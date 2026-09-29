import { UserRole } from '@computer-sales/database';

export const MANAGEMENT_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

export const SALES_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SALES,
] as const;

export const PURCHASING_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.PURCHASING,
] as const;

export const INVENTORY_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.INVENTORY,
] as const;

export const SERVICE_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.TECHNICIAN,
] as const;

export const CASHIER_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
] as const;

export const SALES_PAYMENT_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
] as const;
