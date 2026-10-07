import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import {
  CreatePurchaseInvoiceDto,
  PaymentModeDto,
} from './dto/create-purchase-invoice.dto.js';

import type { PurchaseInvoiceWithRelations } from './purchase-invoice.types.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PurchaseInvoiceQueryDto } from './dto/purchase-invoice-query.dto.js';
import { PurchaseInvoiceListResponse } from './purchase-invoice.types.js';

@Injectable()
export class PurchaseInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private generateInvoiceNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = randomUUID().slice(0, 6).toUpperCase();

    return `PINV-${date}-${suffix}`;
  }

  async create(
    dto: CreatePurchaseInvoiceDto,
    user: AuthenticatedUser,
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

    // The receiving report branch must be accessible
    // to the authenticated user.
    this.branchAccessService.assertCanAccessBranch(user, receiving.branchId);

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

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceWithRelations> {
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

    this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

    return invoice;
  }

  async findAll(
    query: PurchaseInvoiceQueryDto,
    user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceListResponse> {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 100);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    this.branchAccessService.assertCanAccessOptionalBranch(
      user,
      user.role === UserRole.ADMIN ? query.branchId : user.branchId,
    );

    const where: Prisma.PurchaseInvoiceWhereInput =
      user.role === UserRole.ADMIN
        ? {
            ...(query.branchId
              ? {
                  branchId: query.branchId,
                }
              : {}),
          }
        : {
            branchId: user.branchId!,
          };

    if (query.status) {
      where.status = query.status;
    }

    if (search) {
      where.OR = [
        {
          invoiceNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          supplierInvoiceNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          supplier: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          supplier: {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          purchaseOrder: {
            poNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          receiving: {
            receivingNo: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy =
      query.sortBy === 'invoiceNo'
        ? { invoiceNo: sortOrder }
        : query.sortBy === 'invoiceDate'
          ? { invoiceDate: sortOrder }
          : query.sortBy === 'dueDate'
            ? { dueDate: sortOrder }
            : query.sortBy === 'total'
              ? { total: sortOrder }
              : query.sortBy === 'balanceDue'
                ? { balanceDue: sortOrder }
                : query.sortBy === 'status'
                  ? { status: sortOrder }
                  : { createdAt: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),

      this.prisma.purchaseInvoice.count({
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

  async findAwaitingReceivings(
    query: PurchaseInvoiceQueryDto,
    user: AuthenticatedUser,
  ) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 5), 1), 100);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    this.branchAccessService.assertCanAccessOptionalBranch(
      user,
      user.role === UserRole.ADMIN ? query.branchId : user.branchId,
    );

    const where: Prisma.ReceivingWhereInput =
      user.role === UserRole.ADMIN
        ? {
            ...(query.branchId
              ? {
                  branchId: query.branchId,
                }
              : {}),
          }
        : {
            branchId: user.branchId!,
          };

    where.status = 'POSTED';
    where.checkStatus = 'VERIFIED';

    where.purchaseInvoices = {
      none: {
        status: {
          not: 'CANCELLED',
        },
      },
    };

    if (search) {
      where.OR = [
        {
          receivingNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          referenceNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          purchaseOrder: {
            poNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          purchaseOrder: {
            supplier: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.receiving.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          receivedDate: 'desc',
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
      }),

      this.prisma.receiving.count({
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
}
