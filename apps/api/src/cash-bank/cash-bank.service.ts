import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto.js';
import { AddBankReconciliationItemDto } from './dto/add-bank-reconciliation-item.dto.js';
import { CreateCashBankTransactionDto } from './dto/create-cash-bank-transaction.dto.js';
import { CashBankTransactionQueryDto } from './dto/cash-bank-transaction-query.dto.js';

@Injectable()
export class CashBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createReconciliation(
    dto: CreateBankReconciliationDto,
    user: AuthenticatedUser,
  ) {
    // The requested branch must be accessible to the current user.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const statementDate = new Date(dto.statementDate);

    const statementEndingBalance = new Prisma.Decimal(
      dto.statementEndingBalance,
    );

    const [branch, account] = await Promise.all([
      this.prisma.branch.findUnique({
        where: {
          id: dto.branchId,
        },

        select: {
          id: true,
        },
      }),

      this.prisma.cashBankAccount.findUnique({
        where: {
          id: dto.accountId,
        },

        select: {
          id: true,
          branchId: true,
          openingBalance: true,
          isActive: true,
        },
      }),
    ]);

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    // The account must belong to the requested branch.
    if (account.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Cash/Bank account does not belong to this branch.',
      );
    }

    // Defense-in-depth: verify actual account branch.
    this.branchAccessService.assertCanAccessBranch(user, account.branchId);

    if (!account.isActive) {
      throw new BadRequestException('Cash/Bank account is inactive.');
    }

    const [incoming, outgoing] = await Promise.all([
      this.prisma.cashBankTransaction.aggregate({
        where: {
          accountId: dto.accountId,

          transactionDate: {
            lte: statementDate,
          },

          direction: 'IN',
        },

        _sum: {
          amount: true,
        },
      }),

      this.prisma.cashBankTransaction.aggregate({
        where: {
          accountId: dto.accountId,

          transactionDate: {
            lte: statementDate,
          },

          direction: 'OUT',
        },

        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalIn = incoming._sum.amount ?? new Prisma.Decimal(0);

    const totalOut = outgoing._sum.amount ?? new Prisma.Decimal(0);

    const bookBalance = account.openingBalance
      .add(totalIn)
      .sub(totalOut)
      .toDecimalPlaces(2);

    const reconciliationNo = `BR-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return this.prisma.bankReconciliation.create({
      data: {
        reconciliationNo,

        branchId: dto.branchId,
        accountId: dto.accountId,

        statementDate,

        statementEndingBalance,

        bookBalance,

        adjustedBankBalance: statementEndingBalance,

        adjustedBookBalance: bookBalance,

        difference: statementEndingBalance.sub(bookBalance).toDecimalPlaces(2),

        notes: dto.notes?.trim() || null,
      },

      include: {
        items: true,
        account: true,
      },
    });
  }

  async addItem(
    reconciliationId: string,
    dto: AddBankReconciliationItemDto,
    user: AuthenticatedUser,
  ) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: {
        id: reconciliationId,
      },

      include: {
        items: true,
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    // Actual reconciliation branch authorization.
    this.branchAccessService.assertCanAccessBranch(
      user,
      reconciliation.branchId,
    );

    if (reconciliation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft reconciliations can be modified.',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    let transaction: {
      id: string;
      accountId: string;
      direction: string;
      amount: Prisma.Decimal;
      transactionDate: Date;
      referenceNo: string | null;
    } | null = null;

    if (dto.cashBankTransactionId) {
      transaction = await this.prisma.cashBankTransaction.findUnique({
        where: {
          id: dto.cashBankTransactionId,
        },

        select: {
          id: true,
          accountId: true,
          direction: true,
          amount: true,
          transactionDate: true,
          referenceNo: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Cash/Bank transaction not found.');
      }

      if (transaction.accountId !== reconciliation.accountId) {
        throw new BadRequestException(
          'Transaction does not belong to this account.',
        );
      }

      if (transaction.transactionDate > reconciliation.statementDate) {
        throw new BadRequestException(
          'Transaction date is after the reconciliation statement date.',
        );
      }

      if (transaction.amount.toDecimalPlaces(2).equals(amount) === false) {
        throw new BadRequestException(
          'Reconciliation item amount must match the transaction amount.',
        );
      }

      if (dto.type === 'OUTSTANDING_CHECK' && transaction.direction !== 'OUT') {
        throw new BadRequestException(
          'Outstanding checks must reference an OUT transaction.',
        );
      }

      if (dto.type === 'DEPOSIT_IN_TRANSIT' && transaction.direction !== 'IN') {
        throw new BadRequestException(
          'Deposits in transit must reference an IN transaction.',
        );
      }
    }

    if (
      (dto.type === 'OUTSTANDING_CHECK' || dto.type === 'DEPOSIT_IN_TRANSIT') &&
      !transaction
    ) {
      throw new BadRequestException(
        'This reconciliation item requires a Cash/Bank transaction.',
      );
    }

    if (
      transaction &&
      dto.type !== 'OUTSTANDING_CHECK' &&
      dto.type !== 'DEPOSIT_IN_TRANSIT'
    ) {
      throw new BadRequestException(
        'Only outstanding checks or deposits in transit may reference a Cash/Bank transaction.',
      );
    }

    if (transaction) {
      const existing = await this.prisma.bankReconciliationItem.findFirst({
        where: {
          cashBankTransactionId: transaction.id,

          reconciliationId: {
            not: reconciliationId,
          },

          reconciliation: {
            status: {
              in: ['DRAFT', 'COMPLETED'],
            },
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          'This transaction is already included in another bank reconciliation.',
        );
      }
    }

    await this.prisma.bankReconciliationItem.create({
      data: {
        reconciliationId,

        type: dto.type,

        amount,

        cashBankTransactionId: dto.cashBankTransactionId ?? null,

        referenceNo: dto.referenceNo?.trim() || null,

        notes: dto.notes?.trim() || null,
      },
    });

    return this.recalculateReconciliation(reconciliationId);
  }

  async findAll(
    branchId: string | undefined,
    accountId: string | undefined,
    user: AuthenticatedUser,
  ) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {
            ...(branchId
              ? {
                  branchId,
                }
              : {}),

            ...(accountId
              ? {
                  accountId,
                }
              : {}),
          }
        : {
            branchId: user.branchId!,

            ...(accountId
              ? {
                  accountId,
                }
              : {}),
          };

    return this.prisma.bankReconciliation.findMany({
      where,

      include: {
        account: true,
        items: true,
      },

      orderBy: {
        statementDate: 'desc',
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: {
        id,
      },

      include: {
        account: true,

        branch: true,

        items: {
          include: {
            cashBankTransaction: true,
          },
        },
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    // Actual record branch authorization.
    this.branchAccessService.assertCanAccessBranch(
      user,
      reconciliation.branchId,
    );

    return reconciliation;
  }

  async complete(id: string, user: AuthenticatedUser) {
    // Check ownership/access before recalculating.
    const existing = await this.prisma.bankReconciliation.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        branchId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, existing.branchId);

    const reconciliation = await this.recalculateReconciliation(id);

    if (reconciliation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft reconciliations can be completed.',
      );
    }

    if (!reconciliation.difference.equals(0)) {
      throw new BadRequestException(
        `Reconciliation cannot be completed while difference is ${reconciliation.difference.toFixed(
          2,
        )}.`,
      );
    }

    return this.prisma.bankReconciliation.update({
      where: {
        id,
      },

      data: {
        status: 'COMPLETED',
      },

      include: {
        account: true,
        items: true,
      },
    });
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: {
        id,
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(
      user,
      reconciliation.branchId,
    );

    if (reconciliation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft reconciliations can be cancelled.',
      );
    }

    return this.prisma.bankReconciliation.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }

  private async recalculateReconciliation(id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: {
        id,
      },

      include: {
        items: true,
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    const outstandingChecks = reconciliation.items
      .filter((item) => item.type === 'OUTSTANDING_CHECK')
      .reduce((total, item) => total.add(item.amount), new Prisma.Decimal(0));

    const depositsInTransit = reconciliation.items
      .filter((item) => item.type === 'DEPOSIT_IN_TRANSIT')
      .reduce((total, item) => total.add(item.amount), new Prisma.Decimal(0));

    const bankCharges = reconciliation.items
      .filter((item) => item.type === 'BANK_CHARGE')
      .reduce((total, item) => total.add(item.amount), new Prisma.Decimal(0));

    const bankCredits = reconciliation.items
      .filter((item) => item.type === 'BANK_CREDIT')
      .reduce((total, item) => total.add(item.amount), new Prisma.Decimal(0));

    const adjustedBankBalance = reconciliation.statementEndingBalance
      .add(depositsInTransit)
      .sub(outstandingChecks)
      .toDecimalPlaces(2);

    const adjustedBookBalance = reconciliation.bookBalance
      .sub(bankCharges)
      .add(bankCredits)
      .toDecimalPlaces(2);

    const difference = adjustedBankBalance
      .sub(adjustedBookBalance)
      .toDecimalPlaces(2);

    return this.prisma.bankReconciliation.update({
      where: {
        id,
      },

      data: {
        adjustedBankBalance,
        adjustedBookBalance,
        difference,
      },

      include: {
        items: true,
        account: true,
      },
    });
  }

  async createManualTransaction(
    dto: CreateCashBankTransactionDto,
    user: AuthenticatedUser,
  ) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: {
        id: dto.accountId,
      },

      select: {
        id: true,
        branchId: true,
        accountType: true,
        name: true,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    // Authorize against the actual account branch.
    this.branchAccessService.assertCanAccessBranch(user, account.branchId);

    if (account.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Cash/Bank account does not belong to this branch.',
      );
    }

    if (!account.isActive) {
      throw new BadRequestException('Cash/Bank account is inactive.');
    }

    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    const direction = dto.transactionType === 'OTHER_RECEIPT' ? 'IN' : 'OUT';

    return this.prisma.cashBankTransaction.create({
      data: {
        branchId: account.branchId,

        accountId: account.id,

        accountType: account.accountType,

        accountName: account.name,

        transactionType: dto.transactionType,

        direction,

        amount,

        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : new Date(),

        referenceNo: dto.referenceNo?.trim() || null,

        notes: dto.notes?.trim() || null,
      },

      include: {
        account: true,
        branch: true,
      },
    });
  }

  async findTransactions(
    query: CashBankTransactionQueryDto,
    user: AuthenticatedUser,
  ) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = [
      'accountName',
      'transactionType',
      'direction',
      'amount',
      'transactionDate',
      'createdAt',
      'updatedAt',
    ] as const;

    const sortField = allowedSortFields.includes(
      query.sortBy as (typeof allowedSortFields)[number],
    )
      ? query.sortBy!
      : 'transactionDate';

    const where: Prisma.CashBankTransactionWhereInput =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    if (query.direction) {
      where.direction = query.direction;
    }

    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (search) {
      where.OR = [
        {
          accountName: {
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
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cashBankTransaction.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          [sortField]: sortOrder,
        } as Prisma.CashBankTransactionOrderByWithRelationInput,

        include: {
          account: true,
          branch: true,
        },
      }),

      this.prisma.cashBankTransaction.count({
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

  async findTransaction(id: string, user: AuthenticatedUser) {
    const transaction = await this.prisma.cashBankTransaction.findUnique({
      where: {
        id,
      },

      include: {
        account: true,
        branch: true,
        supplierPayment: true,
        customerPayment: true,
        pettyCashReplenishment: true,
        salesReturn: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Cash/Bank transaction not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, transaction.branchId);

    return transaction;
  }
}
