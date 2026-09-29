import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { ReleaseSalesOrderDto } from './dto/release-sales-order.dto.js';

@Injectable()
export class InventoryReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async checkAvailability(salesOrderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.salesOrder.findUnique({
      where: {
        id: salesOrderId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, order.branchId);

    const results = [];

    for (const item of order.items) {
      if (!item.product.trackInventory) {
        results.push({
          salesOrderItemId: item.id,
          productId: item.productId,
          requestedQuantity: item.quantity,
          inventoryQuantity: null,
          reservedQuantity: 0,
          availableQuantity: null,
          available: true,
          inventoryTracked: false,
        });

        continue;
      }

      const balance = await this.prisma.inventoryBalance.findUnique({
        where: {
          branchId_productId: {
            branchId: order.branchId,
            productId: item.productId,
          },
        },
      });

      if (!balance) {
        throw new BadRequestException(
          `No inventory balance found for product ${item.product.sku}.`,
        );
      }

      const reservationAggregate =
        await this.prisma.inventoryReservation.aggregate({
          where: {
            branchId: order.branchId,
            productId: item.productId,
            status: 'RESERVED',
          },
          _sum: {
            quantity: true,
          },
        });

      const reservedQuantity = reservationAggregate._sum.quantity ?? 0;

      const availableQuantity = balance.quantity - reservedQuantity;

      results.push({
        salesOrderItemId: item.id,
        productId: item.productId,
        requestedQuantity: item.quantity,
        inventoryQuantity: balance.quantity,
        reservedQuantity,
        availableQuantity,
        available: availableQuantity >= item.quantity,
        inventoryTracked: true,
      });
    }

    return {
      salesOrderId: order.id,
      orderNo: order.orderNo,
      allAvailable: results.every((item) => item.available),
      items: results,
    };
  }

  async reserve(salesOrderId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },
          include: {
            items: {
              include: {
                product: true,
                inventoryReservation: true,
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException('Sales order not found.');
        }

        this.branchAccessService.assertCanAccessBranch(user, order.branchId);

        if (order.status !== 'CONFIRMED') {
          throw new BadRequestException(
            `Sales order cannot be reserved from status ${order.status}.`,
          );
        }

        /*
         * Re-check inventory inside the same transaction.
         * We do NOT rely only on the earlier GET availability check.
         */

        const reservationsToCreate = [];

        for (const item of order.items) {
          if (!item.product.trackInventory) {
            continue;
          }

          if (item.inventoryReservation) {
            throw new ConflictException(
              `Inventory is already reserved for ${item.product.sku}.`,
            );
          }

          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: item.productId,
              },
            },
          });

          if (!balance) {
            throw new BadRequestException(
              `No inventory balance found for product ${item.product.sku}.`,
            );
          }

          const reservedAggregate = await tx.inventoryReservation.aggregate({
            where: {
              branchId: order.branchId,
              productId: item.productId,
              status: 'RESERVED',
            },
            _sum: {
              quantity: true,
            },
          });

          const reservedQuantity = reservedAggregate._sum.quantity ?? 0;

          const availableQuantity = balance.quantity - reservedQuantity;

          if (availableQuantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient available inventory for ${item.product.sku}. Available: ${availableQuantity}, requested: ${item.quantity}.`,
            );
          }

          reservationsToCreate.push({
            branchId: order.branchId,
            salesOrderId: order.id,
            salesOrderItemId: item.id,
            productId: item.productId,
            quantity: item.quantity,
            status: 'RESERVED' as const,
          });
        }

        for (const reservation of reservationsToCreate) {
          await tx.inventoryReservation.create({
            data: reservation,
          });
        }

        const updatedOrder = await tx.salesOrder.update({
          where: {
            id: order.id,
          },
          data: {
            status: 'RESERVED',
          },
          include: {
            branch: true,
            customer: true,
            quotation: true,
            items: {
              include: {
                product: true,
                inventoryReservation: true,
              },
            },
            inventoryReservations: {
              include: {
                product: true,
              },
            },
          },
        });

        return updatedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async prepare(salesOrderId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: {
          id: salesOrderId,
        },
        include: {
          items: {
            include: {
              product: true,
              inventoryReservation: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      this.branchAccessService.assertCanAccessBranch(user, order.branchId);

      if (order.status !== 'RESERVED') {
        throw new BadRequestException(
          `Sales order cannot be prepared from status ${order.status}.`,
        );
      }

      for (const item of order.items) {
        if (!item.product.trackInventory) {
          continue;
        }

        if (!item.inventoryReservation) {
          throw new BadRequestException(
            `Inventory is not reserved for ${item.product.sku}.`,
          );
        }

        if (item.inventoryReservation.status !== 'RESERVED') {
          throw new BadRequestException(
            `Inventory reservation for ${item.product.sku} is not active.`,
          );
        }
      }

      return tx.salesOrder.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'READY',
        },
        include: {
          branch: true,
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
              inventoryReservation: true,
            },
          },
          inventoryReservations: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async release(
    salesOrderId: string,
    dto: ReleaseSalesOrderDto,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },
          include: {
            items: {
              include: {
                product: true,
                inventoryReservation: true,
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException('Sales order not found.');
        }

        this.branchAccessService.assertCanAccessBranch(user, order.branchId);

        if (order.status !== 'READY') {
          throw new BadRequestException(
            `Sales order cannot be released from status ${order.status}.`,
          );
        }

        const releaseDate = dto.deliveryDate
          ? new Date(dto.deliveryDate)
          : new Date();

        for (const item of order.items) {
          if (!item.product.trackInventory) {
            continue;
          }

          const reservation = item.inventoryReservation;

          if (!reservation) {
            throw new BadRequestException(
              `No inventory reservation found for ${item.product.sku}.`,
            );
          }

          if (reservation.status !== 'RESERVED') {
            throw new BadRequestException(
              `Inventory reservation for ${item.product.sku} is not active.`,
            );
          }

          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: item.productId,
              },
            },
          });

          if (!balance) {
            throw new BadRequestException(
              `Inventory balance not found for ${item.product.sku}.`,
            );
          }

          if (balance.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient inventory for ${item.product.sku}.`,
            );
          }

          const unitCost = balance.averageCost;

          const totalCost = unitCost.mul(item.quantity);

          const newQuantity = balance.quantity - item.quantity;

          await tx.inventoryBalance.update({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: item.productId,
              },
            },
            data: {
              quantity: newQuantity,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              branchId: order.branchId,
              productId: item.productId,
              type: 'SALE_OUT',

              unitCost,
              totalCost,

              // Outgoing transaction does not change
              // weighted average cost.
              averageCostAfter: balance.averageCost,

              quantityChange: -item.quantity,
              balanceAfter: newQuantity,

              referenceType: 'SALES_ORDER',
              referenceId: order.id,

              notes: `Sales order ${order.orderNo} released via ${dto.deliveryMode}.`,
            },
          });

          await tx.inventoryReservation.update({
            where: {
              id: reservation.id,
            },
            data: {
              status: 'CONSUMED',
              consumedAt: releaseDate,
            },
          });
        }

        return tx.salesOrder.update({
          where: {
            id: order.id,
          },
          data: {
            status: 'DELIVERED',
            deliveryMode: dto.deliveryMode,
            deliveryDate: releaseDate,
          },
          include: {
            branch: true,
            customer: true,
            quotation: true,
            items: {
              include: {
                product: true,
                inventoryReservation: true,
              },
            },
            inventoryReservations: {
              include: {
                product: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
