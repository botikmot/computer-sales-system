import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, SalesPaymentMode } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class SalesInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromSalesOrder(
    salesOrderId: string,
    paymentMode: SalesPaymentMode,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: {
          id: salesOrderId,
        },
        include: {
          items: true,
          salesInvoice: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      if (order.status !== 'DELIVERED') {
        throw new BadRequestException(
          'Only delivered sales orders can create a sales invoice.',
        );
      }

      if (order.salesInvoice) {
        throw new ConflictException(
          'A sales invoice already exists for this sales order.',
        );
      }

      const total = new Prisma.Decimal(order.total);

      const invoiceNo = `SI-${this.formatDate()}-${this.randomCode()}`;

      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          branchId: order.branchId,
          customerId: order.customerId,
          salesOrderId: order.id,
          createdById: order.createdById,

          status: 'POSTED',
          paymentMode,

          invoiceDate: new Date(),

          subtotal: order.subtotal,
          discount: order.discount,
          tax: order.tax,
          total,

          amountPaid: new Prisma.Decimal(0),
          balanceDue: total,

          notes: order.notes,

          items: {
            create: order.items.map((item) => ({
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
          salesOrder: true,
          accountsReceivable: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (paymentMode === SalesPaymentMode.CREDIT) {
        await tx.accountsReceivable.create({
          data: {
            branchId: order.branchId,
            customerId: order.customerId,
            salesInvoiceId: invoice.id,

            originalAmount: total,
            amountPaid: new Prisma.Decimal(0),
            balanceDue: total,

            status: 'OPEN',
            dueDate: null,
            notes: order.notes,
          },
        });
      }

      return tx.salesInvoice.findUniqueOrThrow({
        where: {
          id: invoice.id,
        },
        include: {
          branch: true,
          customer: true,
          salesOrder: true,
          accountsReceivable: true,
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
    return this.prisma.salesInvoice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        salesOrder: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }

    return invoice;
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
