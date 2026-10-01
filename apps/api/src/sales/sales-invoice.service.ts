import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  SalesInvoiceStatus,
  SalesPaymentMode,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Injectable()
export class SalesInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createFromSalesOrder(
    salesOrderId: string,
    paymentMode: SalesPaymentMode,
    user: AuthenticatedUser,
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

      // The Sales Order branch must be accessible to the current user.
      this.branchAccessService.assertCanAccessBranch(user, order.branchId);

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

  async findAll(user: AuthenticatedUser, query: SalesListQueryDto) {
    // Non-admin users must belong to a branch.
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = [
      'invoiceNo',
      'invoiceDate',
      'status',
      'paymentMode',
      'total',
      'balanceDue',
      'createdAt',
    ] as const;

    const sortField = allowedSortFields.includes(
      query.sortBy as (typeof allowedSortFields)[number],
    )
      ? query.sortBy!
      : 'createdAt';

    const where: Prisma.SalesInvoiceWhereInput =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    const normalizedSearch = search?.toUpperCase();

    const matchingStatus =
      normalizedSearch &&
      Object.values(SalesInvoiceStatus).includes(
        normalizedSearch as SalesInvoiceStatus,
      )
        ? (normalizedSearch as SalesInvoiceStatus)
        : undefined;

    const matchingPaymentMode =
      normalizedSearch &&
      Object.values(SalesPaymentMode).includes(
        normalizedSearch as SalesPaymentMode,
      )
        ? (normalizedSearch as SalesPaymentMode)
        : undefined;

    if (search) {
      where.OR = [
        {
          invoiceNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          customer: {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          salesOrder: {
            orderNo: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          items: {
            some: {
              product: {
                sku: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          items: {
            some: {
              product: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },

        ...(matchingStatus ? [{ status: matchingStatus }] : []),

        ...(matchingPaymentMode ? [{ paymentMode: matchingPaymentMode }] : []),
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesInvoice.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          [sortField]: sortOrder,
        } as Prisma.SalesInvoiceOrderByWithRelationInput,

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
      }),

      this.prisma.salesInvoice.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
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

    this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

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
