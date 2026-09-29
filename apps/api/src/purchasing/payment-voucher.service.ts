import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { PaymentVoucherWithRelations } from './payment-voucher.types.js';

@Injectable()
export class PaymentVoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createFromSupplierPayment(
    supplierPaymentId: string,
    user: AuthenticatedUser,
  ): Promise<PaymentVoucherWithRelations> {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: {
        id: supplierPaymentId,
      },
      include: {
        supplier: true,
        accountsPayable: true,
        account: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Supplier payment not found.');
    }

    // The supplier payment branch must be accessible
    // to the authenticated user.
    this.branchAccessService.assertCanAccessBranch(user, payment.branchId);

    const existing = await this.prisma.paymentVoucher.findUnique({
      where: {
        supplierPaymentId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Payment voucher already exists for this supplier payment.',
      );
    }

    const voucherNo = `PV-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    return this.prisma.paymentVoucher.create({
      data: {
        voucherNo,
        branchId: payment.branchId,
        supplierPaymentId: payment.id,
        voucherDate: payment.paymentDate,
        payeeName: payment.supplier.name,
        amount: payment.amount,
        purpose: 'Payment to supplier',
        notes: payment.notes,
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
  ): Promise<PaymentVoucherWithRelations[]> {
    // Non-admin users must belong to a branch.
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    return this.prisma.paymentVoucher.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PaymentVoucherWithRelations> {
    const voucher = await this.prisma.paymentVoucher.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException('Payment voucher not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, voucher.branchId);

    return voucher;
  }
}
