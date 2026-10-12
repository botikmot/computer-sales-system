import { Injectable } from '@nestjs/common';
import { UserRole } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

type PendingAction = {
  id: string;
  type: 'PURCHASE_REQUEST' | 'PURCHASE_ORDER' | 'INVENTORY_ADJUSTMENT';
  title: string;
  reference: string;
  description: string;
  href: string;
  actionLabel: string;
  branchName: string;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingActions(user: AuthenticatedUser) {
    // Only roles authorized to approve these workflows receive
    // approval notifications.
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      return {
        items: [],
        count: 0,
      };
    }

    // Never expose other branches to a Manager.
    if (user.role !== UserRole.ADMIN && !user.branchId) {
      return {
        items: [],
        count: 0,
      };
    }

    const branchFilter =
      user.role === UserRole.ADMIN ? {} : { branchId: user.branchId! };

    const [purchaseRequests, purchaseOrders, adjustments] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where: {
          ...branchFilter,
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          requestNo: true,
          branch: {
            select: { name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),

      this.prisma.purchaseOrder.findMany({
        where: {
          ...branchFilter,
          status: 'DRAFT',
        },
        select: {
          id: true,
          poNumber: true,
          branch: {
            select: { name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),

      this.prisma.inventoryAdjustment.findMany({
        where: {
          ...branchFilter,
          status: 'FOR_APPROVAL',
        },
        select: {
          id: true,
          adjustmentNo: true,
          branch: {
            select: { name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);

    const items: PendingAction[] = [
      ...purchaseRequests.map((item) => ({
        id: `purchase-request:${item.id}`,
        type: 'PURCHASE_REQUEST' as const,
        title: 'Purchase request awaiting approval',
        reference: item.requestNo,
        description: `Branch: ${item.branch.name}`,
        href: `/purchase-requests/${item.id}`,
        actionLabel: 'Review request',
        branchName: item.branch.name,
        createdAt: item.updatedAt,
      })),

      ...purchaseOrders.map((item) => ({
        id: `purchase-order:${item.id}`,
        type: 'PURCHASE_ORDER' as const,
        title: 'Purchase order awaiting approval',
        reference: item.poNumber,
        description: `Branch: ${item.branch.name}`,
        href: `/purchase-orders/${item.id}`,
        actionLabel: 'Review purchase order',
        branchName: item.branch.name,
        createdAt: item.updatedAt,
      })),

      ...adjustments.map((item) => ({
        id: `inventory-adjustment:${item.id}`,
        type: 'INVENTORY_ADJUSTMENT' as const,
        title: 'Inventory adjustment awaiting approval',
        reference: item.adjustmentNo,
        description: `Branch: ${item.branch.name}`,
        href: `/adjustments/${item.id}`,
        actionLabel: 'Review adjustment',
        branchName: item.branch.name,
        createdAt: item.updatedAt,
      })),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // The badge represents pending actions, not yet-read notifications.
    const limitedItems = items.slice(0, 50);

    return {
      items: limitedItems,
      count: limitedItems.length,
    };
  }
}
