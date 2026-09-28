import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto.js';
import { AddBankReconciliationItemDto } from './dto/add-bank-reconciliation-item.dto.js';
import { CreateCashBankTransactionDto } from './dto/create-cash-bank-transaction.dto.js';

@Injectable()
export class CashBankService {
  constructor(private readonly prisma: PrismaService) {}

  async createReconciliation(dto: CreateBankReconciliationDto) {
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

    if (account.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Cash/Bank account does not belong to this branch.',
      );
    }

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

  async addItem(reconciliationId: string, dto: AddBankReconciliationItemDto) {
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

    const item = await this.prisma.bankReconciliationItem.create({
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

  async findAll(branchId?: string, accountId?: string) {
    return this.prisma.bankReconciliation.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(accountId ? { accountId } : {}),
      },
      include: {
        account: true,
        items: true,
      },
      orderBy: {
        statementDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: { id },
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

    return reconciliation;
  }

  async complete(id: string) {
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
      where: { id },
      data: {
        status: 'COMPLETED',
      },
      include: {
        account: true,
        items: true,
      },
    });
  }

  async cancel(id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: { id },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found.');
    }

    if (reconciliation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft reconciliations can be cancelled.',
      );
    }

    return this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  private async recalculateReconciliation(id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findUnique({
      where: { id },
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
      where: { id },
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

  async createManualTransaction(dto: CreateCashBankTransactionDto) {
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
        branchId: dto.branchId,
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
}
