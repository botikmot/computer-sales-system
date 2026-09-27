import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service.js';

import {
  CreatePurchaseInvoiceDto,
  PaymentModeDto,
} from './dto/create-purchase-invoice.dto.js';

import type {
  PurchaseInvoiceRecord,
  PurchaseInvoiceWithRelations,
} from './purchase-invoice.types.js';

@Injectable()
export class PurchaseInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  private generateInvoiceNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = randomUUID().slice(0, 6).toUpperCase();

    return `PINV-${date}-${suffix}`;
  }

  async create(
    dto: CreatePurchaseInvoiceDto,
  ): Promise<PurchaseInvoiceWithRelations> {
    const receiving = await this.prisma.receiving.findUnique({
      where: {
        id: dto.receivingId,
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

    if (receiving.status !== 'POSTED') {
      throw new BadRequestException(
        'Supplier invoice can only be created from a posted receiving report.',
      );
    }

    if (receiving.checkStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'Receiving report must be verified before creating the supplier invoice.',
      );
    }

    const receivingItemMap = new Map(
      receiving.items.map((item) => [item.id, item]),
    );

    const selectedItems = dto.items.map((item) => {
      const receivingItem = receivingItemMap.get(item.receivingItemId);

      if (!receivingItem) {
        throw new BadRequestException(
          `Receiving item not found: ${item.receivingItemId}`,
        );
      }

      if (receivingItem.quantityAccepted <= 0) {
        throw new BadRequestException(
          'Cannot invoice a receiving item with zero accepted quantity.',
        );
      }

      return receivingItem;
    });

    const subtotal = selectedItems.reduce((total, item) => {
      const unitCost = Number(item.purchaseOrderItem.unitCost);

      return total + item.quantityAccepted * unitCost;
    }, 0);

    const dueDate =
      dto.paymentMode === PaymentModeDto.TERMS
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : undefined
        : undefined;

    if (dto.paymentMode === PaymentModeDto.TERMS && !dueDate) {
      throw new BadRequestException(
        'Due date is required for TERMS payment mode.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingInvoice = await tx.purchaseInvoice.findFirst({
          where: {
            receivingId: receiving.id,
            status: {
              not: 'CANCELLED',
            },
          },

          select: {
            id: true,
            invoiceNo: true,
          },
        });

        if (existingInvoice) {
          throw new ConflictException(
            `A supplier invoice already exists for this receiving: ${existingInvoice.invoiceNo}`,
          );
        }

        const total = subtotal;

        return tx.purchaseInvoice.create({
          data: {
            invoiceNo: this.generateInvoiceNo(),

            supplierInvoiceNo: dto.supplierInvoiceNo,

            branchId: receiving.branchId,

            supplierId: receiving.purchaseOrder.supplierId,

            purchaseOrderId: receiving.purchaseOrderId,

            receivingId: receiving.id,

            status: 'POSTED',

            paymentMode: dto.paymentMode,

            invoiceDate: dto.invoiceDate
              ? new Date(dto.invoiceDate)
              : new Date(),

            dueDate,

            subtotal: total,

            discount: 0,
            tax: 0,
            total,

            amountPaid: 0,
            balanceDue: total,

            notes: dto.notes,

            items: {
              create: selectedItems.map((item) => ({
                productId: item.productId,

                quantity: item.quantityAccepted,

                unitCost: item.purchaseOrderItem.unitCost,

                subtotal:
                  item.quantityAccepted *
                  Number(item.purchaseOrderItem.unitCost),
              })),
            },
          },

          include: {
            branch: true,
            supplier: true,
            purchaseOrder: true,
            receiving: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException('Unable to create supplier invoice.');
    }
  }

  async findOne(id: string): Promise<PurchaseInvoiceWithRelations> {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: {
        id,
      },

      include: {
        branch: true,
        supplier: true,
        purchaseOrder: true,
        receiving: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }

    return invoice;
  }

  async findAll(): Promise<PurchaseInvoiceWithRelations[]> {
    return this.prisma.purchaseInvoice.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        branch: true,
        supplier: true,
        purchaseOrder: true,
        receiving: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
