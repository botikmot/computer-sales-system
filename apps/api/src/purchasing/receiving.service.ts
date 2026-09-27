import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service.js';

import { CreateReceivingDto } from './dto/create-receiving.dto.js';
import { VerifyReceivingDto } from './dto/verify-receiving.dto.js';

import type {
  ReceivingRecord,
  ReceivingWithRelations,
} from './receiving.types.js';

@Injectable()
export class ReceivingService {
  constructor(private readonly prisma: PrismaService) {}

  private generateReceivingNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = randomUUID().slice(0, 6).toUpperCase();

    return `RCV-${date}-${suffix}`;
  }

  private validateUniqueItems(purchaseOrderItemIds: string[]): void {
    const uniqueIds = new Set(purchaseOrderItemIds);

    if (purchaseOrderItemIds.length !== uniqueIds.size) {
      throw new BadRequestException(
        'Duplicate purchase order items are not allowed.',
      );
    }
  }

  async create(dto: CreateReceivingDto): Promise<ReceivingWithRelations> {
    this.validateUniqueItems(dto.items.map((item) => item.purchaseOrderItemId));

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: {
        id: dto.purchaseOrderId,
      },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found.');
    }

    if (
      purchaseOrder.status !== 'SENT' &&
      purchaseOrder.status !== 'PARTIALLY_RECEIVED'
    ) {
      throw new BadRequestException(
        'Only sent or partially received purchase orders can be received.',
      );
    }

    const purchaseOrderItems = new Map(
      purchaseOrder.items.map((item) => [item.id, item]),
    );

    for (const item of dto.items) {
      const poItem = purchaseOrderItems.get(item.purchaseOrderItemId);

      if (!poItem) {
        throw new BadRequestException(
          `Purchase order item not found: ${item.purchaseOrderItemId}`,
        );
      }

      const remainingQuantity = poItem.quantity - poItem.receivedQuantity;

      if (item.quantityReceived > remainingQuantity) {
        throw new BadRequestException(
          `Cannot receive ${item.quantityReceived} units of product ${poItem.productId}. Remaining quantity is ${remainingQuantity}.`,
        );
      }
    }

    try {
      return await this.prisma.receiving.create({
        data: {
          receivingNo: this.generateReceivingNo(),

          branchId: purchaseOrder.branchId,
          purchaseOrderId: purchaseOrder.id,

          status: 'DRAFT',
          checkStatus: 'PENDING',

          receivedDate: new Date(),
          referenceNo: dto.referenceNo,
          notes: dto.notes,

          items: {
            create: dto.items.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,

              productId: purchaseOrderItems.get(item.purchaseOrderItemId)!
                .productId,

              quantityReceived: item.quantityReceived,

              notes: item.notes,
            })),
          },
        },

        include: {
          branch: true,

          purchaseOrder: {
            include: {
              supplier: true,
            },
          },

          items: {
            include: {
              product: true,
              purchaseOrderItem: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException('Unable to create receiving report.');
    }
  }

  async findOne(id: string): Promise<ReceivingWithRelations> {
    const receiving = await this.prisma.receiving.findUnique({
      where: {
        id,
      },

      include: {
        branch: true,

        purchaseOrder: {
          include: {
            supplier: true,
          },
        },

        items: {
          include: {
            product: true,
            purchaseOrderItem: true,
          },
        },
      },
    });

    if (!receiving) {
      throw new NotFoundException('Receiving report not found.');
    }

    return receiving;
  }

  async findAll(): Promise<ReceivingWithRelations[]> {
    return this.prisma.receiving.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        branch: true,

        purchaseOrder: {
          include: {
            supplier: true,
          },
        },

        items: {
          include: {
            product: true,
            purchaseOrderItem: true,
          },
        },
      },
    });
  }

  async verify(
    id: string,
    dto: VerifyReceivingDto,
  ): Promise<ReceivingWithRelations> {
    const receiving = await this.findOne(id);

    if (receiving.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft receiving reports can be verified.',
      );
    }

    if (receiving.checkStatus !== 'PENDING') {
      throw new BadRequestException(
        'This receiving report has already been checked.',
      );
    }

    const receivingItems = new Map(
      receiving.items.map((item) => [item.id, item]),
    );

    const checkedIds = new Set(dto.items.map((item) => item.receivingItemId));

    if (checkedIds.size !== receiving.items.length) {
      throw new BadRequestException('Every receiving item must be checked.');
    }

    for (const item of dto.items) {
      const receivingItem = receivingItems.get(item.receivingItemId);

      if (!receivingItem) {
        throw new BadRequestException(
          `Receiving item not found: ${item.receivingItemId}`,
        );
      }

      if (
        item.quantityAccepted + item.quantityRejected !==
        receivingItem.quantityReceived
      ) {
        throw new BadRequestException(
          `Accepted plus rejected quantity must equal received quantity for item ${item.receivingItemId}.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        let qualityStatus = 'PASSED';

        if (item.quantityAccepted === 0) {
          qualityStatus = 'FAILED';
        } else if (item.quantityRejected > 0) {
          qualityStatus = 'PARTIAL';
        }

        await tx.receivingItem.update({
          where: {
            id: item.receivingItemId,
          },

          data: {
            quantityAccepted: item.quantityAccepted,

            quantityRejected: item.quantityRejected,

            qualityStatus,

            qualityNotes: item.qualityNotes,
          },
        });
      }

      await tx.receiving.update({
        where: {
          id,
        },

        data: {
          checkStatus: 'VERIFIED',
          checkedAt: new Date(),
          checkNotes: dto.checkNotes,
        },
      });
    });

    return this.findOne(id);
  }

  async post(id: string): Promise<ReceivingWithRelations> {
    const receiving = await this.findOne(id);

    if (receiving.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft receiving reports can be posted.',
      );
    }

    if (receiving.checkStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'Receiving report must be verified before posting.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const currentReceiving = await tx.receiving.findUnique({
        where: {
          id,
        },

        include: {
          items: {
            include: {
              purchaseOrderItem: true,
            },
          },

          purchaseOrder: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!currentReceiving) {
        throw new NotFoundException('Receiving report not found.');
      }

      const acceptedByPoItem = new Map<string, number>();

      for (const item of currentReceiving.items) {
        acceptedByPoItem.set(item.purchaseOrderItemId, item.quantityAccepted);
      }

      for (const item of currentReceiving.items) {
        const acceptedQuantity = item.quantityAccepted;

        if (acceptedQuantity <= 0) {
          continue;
        }

        const poItem = item.purchaseOrderItem;

        const inventory = await tx.inventoryBalance.findUnique({
          where: {
            branchId_productId: {
              branchId: currentReceiving.branchId,
              productId: poItem.productId,
            },
          },
        });

        const previousQuantity = inventory?.quantity ?? 0;

        const previousAverageCost = inventory?.averageCost
          ? Number(inventory.averageCost)
          : 0;

        const unitCost = Number(poItem.unitCost);

        const newQuantity = previousQuantity + acceptedQuantity;

        const newAverageCost =
          newQuantity === 0
            ? 0
            : (previousQuantity * previousAverageCost +
                acceptedQuantity * unitCost) /
              newQuantity;

        const roundedAverageCost = Math.round(newAverageCost * 100) / 100;

        const newBalance = await tx.inventoryBalance.upsert({
          where: {
            branchId_productId: {
              branchId: currentReceiving.branchId,
              productId: poItem.productId,
            },
          },

          create: {
            branchId: currentReceiving.branchId,

            productId: poItem.productId,

            quantity: acceptedQuantity,

            averageCost: roundedAverageCost,
          },

          update: {
            quantity: newQuantity,
            averageCost: roundedAverageCost,
          },
        });

        const totalCost = acceptedQuantity * unitCost;

        await tx.inventoryMovement.create({
          data: {
            branchId: currentReceiving.branchId,

            productId: poItem.productId,

            type: 'PURCHASE_RECEIPT',

            quantityChange: acceptedQuantity,

            balanceAfter: newBalance.quantity,

            unitCost,
            totalCost,

            averageCostAfter: roundedAverageCost,

            referenceType: 'RECEIVING',

            referenceId: currentReceiving.id,

            notes: currentReceiving.notes,
          },
        });

        await tx.purchaseOrderItem.update({
          where: {
            id: poItem.id,
          },

          data: {
            receivedQuantity: poItem.receivedQuantity + acceptedQuantity,
          },
        });
      }

      const allPoItems = currentReceiving.purchaseOrder.items;

      const allReceived = allPoItems.every((poItem) => {
        const acceptedInThisReceiving = acceptedByPoItem.get(poItem.id) ?? 0;

        return (
          poItem.receivedQuantity + acceptedInThisReceiving >= poItem.quantity
        );
      });

      const hasAnyReceipt = allPoItems.some((poItem) => {
        const acceptedInThisReceiving = acceptedByPoItem.get(poItem.id) ?? 0;

        return poItem.receivedQuantity + acceptedInThisReceiving > 0;
      });

      let purchaseOrderStatus: 'PARTIALLY_RECEIVED' | 'RECEIVED' =
        'PARTIALLY_RECEIVED';

      if (allReceived) {
        purchaseOrderStatus = 'RECEIVED';
      } else if (!hasAnyReceipt) {
        throw new BadRequestException(
          'Receiving must contain at least one accepted quantity.',
        );
      }

      await tx.purchaseOrder.update({
        where: {
          id: currentReceiving.purchaseOrderId,
        },

        data: {
          status: purchaseOrderStatus,
        },
      });

      await tx.receiving.update({
        where: {
          id,
        },

        data: {
          status: 'POSTED',
        },
      });

      return tx.receiving.findUniqueOrThrow({
        where: {
          id,
        },

        include: {
          branch: true,

          purchaseOrder: {
            include: {
              supplier: true,
            },
          },

          items: {
            include: {
              product: true,
              purchaseOrderItem: true,
            },
          },
        },
      });
    });
  }
}
