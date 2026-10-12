import { Injectable } from '@nestjs/common';
import { UserRole } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
  createdAt: Date;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(rawQuery: string | undefined, user: AuthenticatedUser) {
    const term = rawQuery?.trim().slice(0, 80) ?? '';

    if (term.length < 2) {
      return { items: [], count: 0 };
    }

    const contains = {
      contains: term,
      mode: 'insensitive' as const,
    };

    const canAccess = (...roles: UserRole[]) => roles.includes(user.role);

    // Non-admin users may only search records in their assigned branch.
    // The fallback value matches no legitimate branch ID.
    const branchFilter =
      user.role === UserRole.ADMIN
        ? {}
        : { branchId: user.branchId ?? '__no_assigned_branch__' };

    const [
      customers,
      suppliers,
      products,
      inquiries,
      quotations,
      salesOrders,
      salesInvoices,
      purchaseRequests,
      supplierQuotations,
      purchaseOrders,
      receivings,
      purchaseInvoices,
      serviceJobs,
      adjustments,
    ] = await Promise.all([
      // Shared customer master data; GET customer endpoints are available
      // to authenticated users in the existing application.
      this.prisma.customer.findMany({
        where: {
          OR: [
            { name: contains },
            { code: contains },
            { email: contains },
            { contactNumber: contains },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.supplier.findMany({
            where: {
              OR: [
                { name: contains },
                { code: contains },
                { contactPerson: contains },
                { email: contains },
              ],
            },
            select: {
              id: true,
              code: true,
              name: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
        ? this.prisma.product.findMany({
            where: {
              OR: [
                { name: contains },
                { sku: contains },
                { brand: contains },
                { model: contains },
              ],
            },
            select: {
              id: true,
              sku: true,
              name: true,
              brand: true,
              model: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
        ? this.prisma.salesInquiry.findMany({
            where: {
              ...branchFilter,
              OR: [
                { inquiryNo: contains },
                { customer: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              inquiryNo: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
        ? this.prisma.salesQuotation.findMany({
            where: {
              ...branchFilter,
              OR: [
                { quotationNo: contains },
                { customer: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              quotationNo: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
        ? this.prisma.salesOrder.findMany({
            where: {
              ...branchFilter,
              OR: [
                { orderNo: contains },
                { customer: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              orderNo: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.SALES,
        UserRole.CASHIER,
      )
        ? this.prisma.salesInvoice.findMany({
            where: {
              ...branchFilter,
              OR: [
                { invoiceNo: contains },
                { customer: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              invoiceNo: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.purchaseRequest.findMany({
            where: {
              ...branchFilter,
              OR: [{ requestNo: contains }, { purpose: contains }],
            },
            select: {
              id: true,
              requestNo: true,
              purpose: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.supplierQuotation.findMany({
            where: {
              ...branchFilter,
              OR: [
                { quotationNo: contains },
                { supplier: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              quotationNo: true,
              status: true,
              createdAt: true,
              supplier: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.purchaseOrder.findMany({
            where: {
              ...branchFilter,
              OR: [
                { poNumber: contains },
                { supplier: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              poNumber: true,
              status: true,
              createdAt: true,
              supplier: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.receiving.findMany({
            where: {
              ...branchFilter,
              OR: [{ receivingNo: contains }, { referenceNo: contains }],
            },
            select: {
              id: true,
              receivingNo: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
        ? this.prisma.purchaseInvoice.findMany({
            where: {
              ...branchFilter,
              OR: [
                { invoiceNo: contains },
                { supplierInvoiceNo: contains },
                { supplier: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              invoiceNo: true,
              status: true,
              createdAt: true,
              supplier: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
        ? this.prisma.serviceJob.findMany({
            where: {
              ...branchFilter,
              ...(user.role === UserRole.TECHNICIAN
                ? { technicianId: user.id }
                : {}),
              OR: [
                { jobNo: contains },
                { customer: { is: { name: contains } } },
              ],
            },
            select: {
              id: true,
              jobNo: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),

      canAccess(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
        ? this.prisma.inventoryAdjustment.findMany({
            where: {
              ...branchFilter,
              OR: [{ adjustmentNo: contains }, { notes: contains }],
            },
            select: {
              id: true,
              adjustmentNo: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    const items: SearchResult[] = [
      ...customers.map((item) => ({
        id: item.id,
        type: 'Customer',
        title: item.name,
        subtitle: `Customer · ${item.code}`,
        href: '/settings/customers',
        createdAt: item.createdAt,
      })),

      ...suppliers.map((item) => ({
        id: item.id,
        type: 'Supplier',
        title: item.name,
        subtitle: `Supplier · ${item.code}`,
        href: `/suppliers/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...products.map((item) => ({
        id: item.id,
        type: 'Product',
        title: item.name,
        subtitle: `SKU · ${item.sku}${item.brand ? ` · ${item.brand}` : ''}`,
        href: `/products/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...inquiries.map((item) => ({
        id: item.id,
        type: 'Sales Inquiry',
        title: item.inquiryNo,
        subtitle: item.customer.name,
        status: item.status,
        href: `/sales/inquiries/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...quotations.map((item) => ({
        id: item.id,
        type: 'Sales Quotation',
        title: item.quotationNo,
        subtitle: item.customer.name,
        status: item.status,
        href: `/sales/quotations/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...salesOrders.map((item) => ({
        id: item.id,
        type: 'Sales Order',
        title: item.orderNo,
        subtitle: item.customer.name,
        status: item.status,
        href: `/sales/orders/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...salesInvoices.map((item) => ({
        id: item.id,
        type: 'Sales Invoice',
        title: item.invoiceNo,
        subtitle: item.customer.name,
        status: item.status,
        href: `/sales/invoices/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...purchaseRequests.map((item) => ({
        id: item.id,
        type: 'Purchase Request',
        title: item.requestNo,
        subtitle: item.purpose ?? 'Purchase request',
        status: item.status,
        href: `/purchase-requests/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...supplierQuotations.map((item) => ({
        id: item.id,
        type: 'Supplier Quotation',
        title: item.quotationNo,
        subtitle: item.supplier.name,
        status: item.status,
        href: `/supplier-quotations/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...purchaseOrders.map((item) => ({
        id: item.id,
        type: 'Purchase Order',
        title: item.poNumber,
        subtitle: item.supplier.name,
        status: item.status,
        href: `/purchase-orders/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...receivings.map((item) => ({
        id: item.id,
        type: 'Receiving',
        title: item.receivingNo,
        subtitle: 'Receiving record',
        status: item.status,
        href: `/receiving/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...purchaseInvoices.map((item) => ({
        id: item.id,
        type: 'Purchase Invoice',
        title: item.invoiceNo,
        subtitle: item.supplier.name,
        status: item.status,
        href: `/purchase-invoices/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...serviceJobs.map((item) => ({
        id: item.id,
        type: 'Service Job',
        title: item.jobNo,
        subtitle: item.customer.name,
        status: item.status,
        href: `/service-jobs/${item.id}`,
        createdAt: item.createdAt,
      })),

      ...adjustments.map((item) => ({
        id: item.id,
        type: 'Inventory Adjustment',
        title: item.adjustmentNo,
        subtitle: 'Inventory adjustment',
        status: item.status,
        href: `/adjustments/${item.id}`,
        createdAt: item.createdAt,
      })),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limitedItems = items.slice(0, 20);

    return {
      items: limitedItems,
      count: limitedItems.length,
    };
  }
}
