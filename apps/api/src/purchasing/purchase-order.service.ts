import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service.js';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';

import type {
  PurchaseOrderRecord,
  PurchaseOrderWithRelations,
} from './purchase-order.types.js';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  private generatePoNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = randomUUID().slice(0, 6).toUpperCase();

    return `PO-${date}-${suffix}`;
  }

  async createFromQuotation(
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    const quotation = await this.prisma.supplierQuotation.findUnique({
      where: {
        id: dto.supplierQuotationId,
      },
      include: {
        branch: true,
        supplier: true,
        purchaseRequest: true,
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Supplier quotation not found.');
    }

    if (quotation.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Only accepted supplier quotations can be converted to a purchase order.',
      );
    }

    if (!quotation.items.length) {
      throw new BadRequestException(
        'Cannot create a purchase order without quotation items.',
      );
    }

    const existingPo = await this.prisma.purchaseOrder.findFirst({
      where: {
        supplierQuotationId: quotation.id,
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        id: true,
        poNumber: true,
      },
    });

    if (existingPo) {
      throw new ConflictException(
        `A purchase order already exists for this quotation: ${existingPo.poNumber}`,
      );
    }

    try {
      return await this.prisma.purchaseOrder.create({
        data: {
          poNumber: this.generatePoNumber(),

          branchId: quotation.branchId,
          supplierId: quotation.supplierId,

          purchaseRequestId: quotation.purchaseRequestId,
          supplierQuotationId: quotation.id,

          status: 'DRAFT',

          orderDate: new Date(),

          expectedDate: dto.expectedDate
            ? new Date(dto.expectedDate)
            : undefined,

          notes: dto.notes,

          subtotal: quotation.subtotal,
          discount: quotation.discount,
          tax: quotation.tax,
          total: quotation.total,

          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.subtotal,
              receivedQuantity: 0,
            })),
          },
        },

        include: {
          branch: true,
          supplier: true,
          purchaseRequest: true,
          supplierQuotation: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException('Unable to create purchase order.');
    }
  }

  async findOne(id: string): Promise<PurchaseOrderWithRelations> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplier: true,
        purchaseRequest: true,
        supplierQuotation: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found.');
    }

    return order;
  }

  async findAll(branchId?: string): Promise<PurchaseOrderWithRelations[]> {
    return this.prisma.purchaseOrder.findMany({
      where: branchId
        ? {
            branchId,
          }
        : {},
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        supplier: true,
        purchaseRequest: true,
        supplierQuotation: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async approve(id: string): Promise<PurchaseOrderRecord> {
    const order = await this.findOne(id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase orders can be approved.',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: {
        id,
      },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async markSent(id: string): Promise<PurchaseOrderRecord> {
    const order = await this.findOne(id);

    if (order.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved purchase orders can be sent.',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: {
        id,
      },
      data: {
        status: 'SENT',
      },
    });
  }

  async cancel(id: string): Promise<PurchaseOrderRecord> {
    const order = await this.findOne(id);

    if (order.status !== 'DRAFT' && order.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only draft or approved purchase orders can be cancelled.',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: {
        id,
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}
