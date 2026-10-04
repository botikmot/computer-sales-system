import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AccountsPayableStatus,
  Prisma,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateAccountsPayableDto } from './dto/create-accounts-payable.dto.js';
import { AccountsPayableQueryDto } from './dto/accounts-payable-query.dto.js';

import type { AccountsPayableWithRelations } from './accounts-payable.types.js';

@Injectable()
export class AccountsPayableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createFromInvoice(
    dto: CreateAccountsPayableDto,
    user: AuthenticatedUser,
  ): Promise<AccountsPayableWithRelations> {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: {
        id: dto.purchaseInvoiceId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

    if (invoice.status !== 'POSTED') {
      throw new BadRequestException(
        'Only posted purchase invoices can create accounts payable.',
      );
    }

    if (invoice.balanceDue.lte(0)) {
      throw new BadRequestException(
        'This purchase invoice has no outstanding balance.',
      );
    }

    const existing = await this.prisma.accountsPayable.findUnique({
      where: {
        purchaseInvoiceId: invoice.id,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Accounts payable already exists for this purchase invoice.',
      );
    }

    try {
      return await this.prisma.accountsPayable.create({
        data: {
          branchId: invoice.branchId,
          supplierId: invoice.supplierId,
          purchaseInvoiceId: invoice.id,

          paymentMode: invoice.paymentMode,

          status: AccountsPayableStatus.OPEN,

          originalAmount: invoice.total,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,

          dueDate: invoice.dueDate,

          notes: dto.notes ?? invoice.notes,
        },

        include: {
          branch: true,
          supplier: true,
          purchaseInvoice: true,
        },
      });
    } catch {
      throw new ConflictException('Unable to record accounts payable.');
    }
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AccountsPayableWithRelations> {
    const payable = await this.prisma.accountsPayable.findUnique({
      where: {
        id,
      },

      include: {
        branch: true,
        supplier: true,
        purchaseInvoice: true,
      },
    });

    if (!payable) {
      throw new NotFoundException('Accounts payable not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, payable.branchId);

    return payable;
  }

  async findAll(user: AuthenticatedUser, query: AccountsPayableQueryDto) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = [
      'dueDate',
      'originalAmount',
      'amountPaid',
      'balanceDue',
      'status',
      'paymentMode',
      'createdAt',
      'updatedAt',
    ] as const;

    const sortField = allowedSortFields.includes(
      query.sortBy as (typeof allowedSortFields)[number],
    )
      ? query.sortBy!
      : 'createdAt';

    const where: Prisma.AccountsPayableWhereInput =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    if (query.status) {
      where.status = query.status;
    }

    if (search) {
      where.OR = [
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
          purchaseInvoice: {
            invoiceNo: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          purchaseInvoice: {
            supplierInvoiceNo: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.accountsPayable.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          [sortField]: sortOrder,
        } as Prisma.AccountsPayableOrderByWithRelationInput,

        include: {
          branch: true,
          supplier: true,
          purchaseInvoice: true,
        },
      }),

      this.prisma.accountsPayable.count({
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
