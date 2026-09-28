import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromQuotation(quotationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.salesQuotation.findUnique({
        where: {
          id: quotationId,
        },
        include: {
          items: true,
          salesOrder: true,
        },
      });

      if (!quotation) {
        throw new NotFoundException('Sales quotation not found.');
      }

      if (quotation.status !== 'ACCEPTED') {
        throw new BadRequestException(
          'Only accepted quotations can be converted to a sales order.',
        );
      }

      if (quotation.salesOrder) {
        throw new ConflictException(
          'A sales order already exists for this quotation.',
        );
      }

      const orderNo = `SO-${this.formatDate()}-${this.randomCode()}`;

      const order = await tx.salesOrder.create({
        data: {
          orderNo,
          branchId: quotation.branchId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          createdById: quotation.createdById,

          status: 'CONFIRMED',

          orderDate: new Date(),

          subtotal: quotation.subtotal,
          discount: quotation.discount,
          tax: quotation.tax,
          total: quotation.total,

          notes: quotation.notes,

          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          branch: true,
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      await tx.salesQuotation.update({
        where: {
          id: quotation.id,
        },
        data: {
          status: 'CONVERTED',
        },
      });

      return tx.salesOrder.findUniqueOrThrow({
        where: {
          id: order.id,
        },
        include: {
          branch: true,
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.salesOrder.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        quotation: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        quotation: true,
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

    return order;
  }

  private formatDate(): string {
    const date = new Date();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}${m}${d}`;
  }

  private randomCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
