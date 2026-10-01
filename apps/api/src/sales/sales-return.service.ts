import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  SalesReturnSettlementMode,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { CreateSalesReturnDto } from './dto/create-sales-return.dto.js';
import type { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Injectable()
export class SalesReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateSalesReturnDto, user: AuthenticatedUser) {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Sales return must contain at least one item.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: {
          id: dto.salesInvoiceId,
        },
        include: {
          customer: true,
          branch: true,
          items: {
            include: {
              product: true,
            },
          },
          accountsReceivable: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      // The sales invoice branch must be accessible to the current user.
      this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

      if (invoice.status !== 'POSTED') {
        throw new BadRequestException(
          'Only posted sales invoices can be returned.',
        );
      }

      const invoiceItems = new Map(
        invoice.items.map((item) => [item.id, item]),
      );

      const existingReturns = await tx.salesReturnItem.findMany({
        where: {
          salesReturn: {
            salesInvoiceId: invoice.id,
            status: 'POSTED',
          },
        },
        select: {
          salesInvoiceItemId: true,
          quantity: true,
        },
      });

      const returnedQuantities = new Map<string, number>();

      for (const item of existingReturns) {
        returnedQuantities.set(
          item.salesInvoiceItemId,
          (returnedQuantities.get(item.salesInvoiceItemId) ?? 0) +
            item.quantity,
        );
      }

      const preparedItems: Array<{
        salesInvoiceItemId: string;
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }> = [];

      let subtotal = new Prisma.Decimal(0);

      for (const dtoItem of dto.items) {
        const invoiceItem = invoiceItems.get(dtoItem.salesInvoiceItemId);

        if (!invoiceItem) {
          throw new BadRequestException(
            `Sales invoice item ${dtoItem.salesInvoiceItemId} does not belong to this invoice.`,
          );
        }

        const alreadyReturned = returnedQuantities.get(invoiceItem.id) ?? 0;

        const remainingQuantity = invoiceItem.quantity - alreadyReturned;

        if (dtoItem.quantity > remainingQuantity) {
          throw new BadRequestException(
            `Return quantity for ${invoiceItem.product.sku} exceeds the remaining returnable quantity.`,
          );
        }

        const lineSubtotal = new Prisma.Decimal(invoiceItem.unitPrice).mul(
          dtoItem.quantity,
        );

        subtotal = subtotal.add(lineSubtotal);

        preparedItems.push({
          salesInvoiceItemId: invoiceItem.id,
          productId: invoiceItem.productId,
          quantity: dtoItem.quantity,
          unitPrice: invoiceItem.unitPrice,
          subtotal: lineSubtotal,
        });
      }

      if (subtotal.lte(0)) {
        throw new BadRequestException(
          'Sales return total must be greater than zero.',
        );
      }

      // Pro-rate invoice-level discount and tax based on returned
      // item subtotal. This preserves the original invoice and gives
      // the returned portion an appropriate financial value.
      let discountShare = new Prisma.Decimal(0);
      let taxShare = new Prisma.Decimal(0);

      if (invoice.subtotal.gt(0)) {
        const ratio = subtotal.div(invoice.subtotal);

        discountShare = invoice.discount.mul(ratio);
        taxShare = invoice.tax.mul(ratio);
      }

      const total = subtotal
        .sub(discountShare)
        .add(taxShare)
        .toDecimalPlaces(2);

      // ----------------------------------
      // SETTLEMENT VALIDATION
      // ----------------------------------

      let refundAccount: {
        id: string;
        branchId: string;
        accountType: 'CASH' | 'BANK';
        name: string;
        isActive: boolean;
      } | null = null;

      if (dto.settlementMode === SalesReturnSettlementMode.CASH_REFUND) {
        if (!dto.refundAccountId) {
          throw new BadRequestException(
            'refundAccountId is required for CASH_REFUND.',
          );
        }

        refundAccount = await tx.cashBankAccount.findUnique({
          where: {
            id: dto.refundAccountId,
          },
          select: {
            id: true,
            branchId: true,
            accountType: true,
            name: true,
            isActive: true,
          },
        });

        if (!refundAccount) {
          throw new NotFoundException('Refund Cash/Bank account not found.');
        }

        if (!refundAccount.isActive) {
          throw new BadRequestException(
            'Refund Cash/Bank account is inactive.',
          );
        }

        if (refundAccount.branchId !== invoice.branchId) {
          throw new BadRequestException(
            'Refund account does not belong to the invoice branch.',
          );
        }

        if (total.gt(invoice.amountPaid)) {
          throw new BadRequestException(
            'Cash refund cannot exceed the amount already paid on the invoice.',
          );
        }
      }

      if (dto.settlementMode === SalesReturnSettlementMode.AR_ADJUSTMENT) {
        if (invoice.paymentMode !== 'CREDIT') {
          throw new BadRequestException(
            'AR_ADJUSTMENT is only available for credit sales invoices.',
          );
        }

        if (!invoice.accountsReceivable) {
          throw new BadRequestException(
            'Accounts receivable record is missing for this credit invoice.',
          );
        }

        if (total.gt(invoice.accountsReceivable.balanceDue)) {
          throw new BadRequestException(
            'AR adjustment cannot exceed the outstanding receivable balance.',
          );
        }
      }

      // ----------------------------------
      // CREATE SALES RETURN
      // ----------------------------------

      const returnNo = `SR-${this.formatDate()}-${this.randomCode()}`;

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo,
          branchId: invoice.branchId,
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,

          status: 'POSTED',
          settlementMode: dto.settlementMode,

          returnDate: new Date(),

          subtotal,
          total,

          reason: dto.reason,
          notes: dto.notes,

          refundAccountId:
            dto.settlementMode === SalesReturnSettlementMode.CASH_REFUND
              ? refundAccount!.id
              : null,

          createdById: dto.createdById ?? null,

          items: {
            create: preparedItems.map((item) => ({
              salesInvoiceItemId: item.salesInvoiceItemId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      // ----------------------------------
      // INVENTORY RETURN
      // ----------------------------------

      for (const item of preparedItems) {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            branchId_productId: {
              branchId: invoice.branchId,
              productId: item.productId,
            },
          },
        });

        if (!balance) {
          throw new BadRequestException(
            `Inventory balance not found for product ${item.productId}.`,
          );
        }

        const unitCost = balance.averageCost;
        const totalCost = unitCost.mul(item.quantity);

        const newQuantity = balance.quantity + item.quantity;

        await tx.inventoryBalance.update({
          where: {
            branchId_productId: {
              branchId: invoice.branchId,
              productId: item.productId,
            },
          },
          data: {
            quantity: newQuantity,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            branchId: invoice.branchId,
            productId: item.productId,

            type: 'SALES_RETURN',

            unitCost,
            totalCost,

            averageCostAfter: balance.averageCost,

            quantityChange: item.quantity,
            balanceAfter: newQuantity,

            referenceType: 'SALES_RETURN',
            referenceId: salesReturn.id,

            notes: `Sales return ${salesReturn.returnNo}.`,
            createdById: dto.createdById ?? null,
          },
        });
      }

      // ----------------------------------
      // A/R ADJUSTMENT
      // ----------------------------------

      if (dto.settlementMode === SalesReturnSettlementMode.AR_ADJUSTMENT) {
        const ar = invoice.accountsReceivable!;

        const newOriginalAmount = ar.originalAmount.sub(total);
        const newBalanceDue = ar.balanceDue.sub(total);

        const newStatus = newBalanceDue.eq(0) ? 'PAID' : 'PARTIALLY_PAID';

        await tx.accountsReceivable.update({
          where: {
            id: ar.id,
          },
          data: {
            originalAmount: newOriginalAmount,
            balanceDue: newBalanceDue,
            status: newStatus,
          },
        });

        // Keep the Sales Invoice balance synchronized with A/R.
        // amountPaid represents actual customer payments and must not
        // be changed by an AR adjustment.
        await tx.salesInvoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            balanceDue: newBalanceDue,
          },
        });
      }

      // ----------------------------------
      // CASH REFUND
      // ----------------------------------

      if (dto.settlementMode === SalesReturnSettlementMode.CASH_REFUND) {
        await tx.cashBankTransaction.create({
          data: {
            branchId: invoice.branchId,

            salesReturnId: salesReturn.id,

            accountId: refundAccount!.id,
            accountType: refundAccount!.accountType,
            accountName: refundAccount!.name,

            transactionType: 'CUSTOMER_REFUND',
            direction: 'OUT',

            amount: total,

            transactionDate: salesReturn.returnDate,

            referenceNo: salesReturn.returnNo,
            notes:
              dto.notes ?? `Refund for sales return ${salesReturn.returnNo}.`,
          },
        });
      }

      return tx.salesReturn.findUniqueOrThrow({
        where: {
          id: salesReturn.id,
        },
        include: {
          branch: true,
          customer: true,
          salesInvoice: true,
          items: {
            include: {
              product: true,
              salesInvoiceItem: true,
            },
          },
          refundAccount: true,
          cashBankTransaction: true,
        },
      });
    });
  }

  async findAll(user: AuthenticatedUser, query: SalesListQueryDto) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const search = query.search?.trim();
    const normalizedSearch = search?.toUpperCase();

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = [
      'returnNo',
      'returnDate',
      'total',
      'status',
      'settlementMode',
      'createdAt',
    ] as const;

    const sortField = allowedSortFields.includes(
      query.sortBy as (typeof allowedSortFields)[number],
    )
      ? query.sortBy!
      : 'createdAt';

    const where: Prisma.SalesReturnWhereInput =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    const matchingStatus =
      normalizedSearch &&
      ['DRAFT', 'POSTED', 'CANCELLED'].includes(normalizedSearch)
        ? normalizedSearch
        : undefined;

    const matchingSettlementMode =
      normalizedSearch &&
      ['CASH_REFUND', 'AR_ADJUSTMENT', 'NO_REFUND'].includes(normalizedSearch)
        ? normalizedSearch
        : undefined;

    if (search) {
      where.OR = [
        {
          returnNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          reason: {
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
            is: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          customer: {
            is: {
              code: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          salesInvoice: {
            invoiceNo: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          refundAccount: {
            is: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          refundAccount: {
            is: {
              accountNumber: {
                contains: search,
                mode: 'insensitive',
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
        ...(matchingStatus
          ? [
              {
                status:
                  matchingStatus as Prisma.SalesReturnWhereInput['status'],
              },
            ]
          : []),
        ...(matchingSettlementMode
          ? [
              {
                settlementMode:
                  matchingSettlementMode as Prisma.SalesReturnWhereInput['settlementMode'],
              },
            ]
          : []),
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesReturn.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          [sortField]: sortOrder,
        } as Prisma.SalesReturnOrderByWithRelationInput,

        include: {
          branch: true,
          customer: true,
          salesInvoice: true,
          items: {
            include: {
              product: true,
              salesInvoiceItem: true,
            },
          },
          refundAccount: true,
          cashBankTransaction: true,
        },
      }),

      this.prisma.salesReturn.count({
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
    const salesReturn = await this.prisma.salesReturn.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        salesInvoice: true,
        items: {
          include: {
            product: true,
            salesInvoiceItem: true,
          },
        },
        refundAccount: true,
        cashBankTransaction: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, salesReturn.branchId);

    return salesReturn;
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
