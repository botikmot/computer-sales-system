import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto.js';

import { SupplierPaymentQueryDto } from './dto/supplier-payment-query.dto.js';

@Injectable()
export class SupplierPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateSupplierPaymentDto, user: AuthenticatedUser) {
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lte(0)) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ap = await tx.accountsPayable.findUnique({
        where: {
          id: dto.accountsPayableId,
        },
        include: {
          supplier: true,
          branch: true,
          purchaseInvoice: true,
        },
      });

      if (!ap) {
        throw new NotFoundException('Accounts payable record not found.');
      }

      // The A/P branch must be accessible to the current user.
      this.branchAccessService.assertCanAccessBranch(user, ap.branchId);

      const account = await tx.cashBankAccount.findUnique({
        where: {
          id: dto.accountId,
        },
      });

      if (!account) {
        throw new NotFoundException('Cash/Bank account not found.');
      }

      if (!account.isActive) {
        throw new BadRequestException('Cash/Bank account is inactive.');
      }

      if (account.branchId !== ap.branchId) {
        throw new BadRequestException(
          'Cash/Bank account does not belong to the same branch.',
        );
      }

      if (ap.status === 'CANCELLED') {
        throw new BadRequestException(
          'Cannot pay a cancelled accounts payable.',
        );
      }

      if (amount.gt(ap.balanceDue)) {
        throw new BadRequestException(
          'Payment amount cannot exceed the outstanding balance.',
        );
      }

      const paymentDate = dto.paymentDate
        ? new Date(dto.paymentDate)
        : new Date();

      const newAmountPaid = ap.amountPaid.plus(amount);
      const newBalanceDue = ap.balanceDue.minus(amount);

      const newStatus = newBalanceDue.eq(0) ? 'PAID' : 'PARTIALLY_PAID';

      const paymentNo = `SP-${this.generateReference()}`;

      const payment = await tx.supplierPayment.create({
        data: {
          paymentNo,

          branchId: ap.branchId,
          supplierId: ap.supplierId,
          accountsPayableId: ap.id,

          accountId: account.id,
          accountType: account.accountType,

          amount,

          paymentDate,

          referenceNo: dto.referenceNo,
          notes: dto.notes,
          status: 'POSTED',
        },
      });

      await tx.accountsPayable.update({
        where: {
          id: ap.id,
        },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await tx.purchaseInvoice.update({
        where: {
          id: ap.purchaseInvoiceId,
        },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
        },
      });

      await tx.cashBankTransaction.create({
        data: {
          branchId: ap.branchId,

          supplierPaymentId: payment.id,

          accountId: account.id,
          accountType: account.accountType,
          accountName: account.name,

          transactionType: 'SUPPLIER_PAYMENT',
          direction: 'OUT',

          amount,

          transactionDate: paymentDate,

          referenceNo: dto.referenceNo,
          notes: dto.notes,
        },
      });

      return tx.supplierPayment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },
        include: {
          branch: true,
          supplier: true,
          accountsPayable: true,
          cashBankTransaction: true,
        },
      });
    });
  }

  async findAll(query: SupplierPaymentQueryDto, user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where = {
      ...(user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          }),

      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(query.search
        ? {
            OR: [
              {
                paymentNo: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                referenceNo: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                notes: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                supplier: {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                supplier: {
                  code: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = {
      [query.sortBy]: query.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy,

        include: {
          branch: true,
          supplier: true,
          accountsPayable: true,
          cashBankTransaction: true,
        },
      }),

      this.prisma.supplierPayment.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplier: true,
        accountsPayable: true,
        cashBankTransaction: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Supplier payment not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, payment.branchId);

    return payment;
  }

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }
}
