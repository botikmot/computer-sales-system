import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { AccountsReceivableWithRelations } from './accounts-receivable.types.js';

@Injectable()
export class AccountsReceivableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async findAll(
    user: AuthenticatedUser,
  ): Promise<AccountsReceivableWithRelations[]> {
    // Non-admin users must belong to a branch.
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    return this.prisma.accountsReceivable.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        salesInvoice: true,
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AccountsReceivableWithRelations> {
    const record = await this.prisma.accountsReceivable.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        salesInvoice: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Accounts receivable not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, record.branchId);

    return record;
  }

  async createFromInvoice(salesInvoiceId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: {
          id: salesInvoiceId,
        },
        include: {
          accountsReceivable: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      // The invoice branch must be accessible before creating A/R.
      this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

      if (invoice.status !== 'POSTED') {
        throw new BadRequestException(
          'Only posted sales invoices can create accounts receivable.',
        );
      }

      if (invoice.paymentMode !== 'CREDIT') {
        throw new BadRequestException(
          'Only CREDIT sales invoices can create accounts receivable.',
        );
      }

      if (invoice.balanceDue.lte(0)) {
        throw new BadRequestException(
          'This sales invoice has no outstanding balance.',
        );
      }

      if (invoice.accountsReceivable) {
        throw new ConflictException(
          'Accounts receivable already exists for this sales invoice.',
        );
      }

      return tx.accountsReceivable.create({
        data: {
          branchId: invoice.branchId,
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,

          originalAmount: invoice.total,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,

          status: 'OPEN',
          dueDate: invoice.dueDate,
          notes: invoice.notes,
        },
        include: {
          branch: true,
          customer: true,
          salesInvoice: true,
        },
      });
    });
  }
}
