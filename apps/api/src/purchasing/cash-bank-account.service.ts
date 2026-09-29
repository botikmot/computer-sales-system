import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateCashBankAccountDto } from './dto/create-cash-bank-account.dto.js';

@Injectable()
export class CashBankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateCashBankAccountDto, user: AuthenticatedUser) {
    // The requested branch must be accessible by the logged-in user.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const branch = await this.prisma.branch.findUnique({
      where: {
        id: dto.branchId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    try {
      return await this.prisma.cashBankAccount.create({
        data: {
          branchId: dto.branchId,
          accountType: dto.accountType,
          name: dto.name,
          accountNumber: dto.accountNumber,
          openingBalance: new Prisma.Decimal(dto.openingBalance ?? 0),
        },
      });
    } catch {
      throw new ConflictException(
        'Cash/Bank account already exists for this branch.',
      );
    }
  }

  async findAll(user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    return this.prisma.cashBankAccount.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    // Actual account branch check.
    this.branchAccessService.assertCanAccessBranch(user, account.branchId);

    return account;
  }

  async getBalance(id: string, user: AuthenticatedUser) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    // Do not allow balance lookup across branches.
    this.branchAccessService.assertCanAccessBranch(user, account.branchId);

    const transactions = await this.prisma.cashBankTransaction.findMany({
      where: {
        accountId: id,
      },
      select: {
        amount: true,
        direction: true,
      },
    });

    let balance = account.openingBalance;

    for (const transaction of transactions) {
      if (transaction.direction === 'IN') {
        balance = balance.plus(transaction.amount);
      } else {
        balance = balance.minus(transaction.amount);
      }
    }

    return {
      accountId: account.id,
      accountType: account.accountType,
      name: account.name,
      openingBalance: account.openingBalance,
      currentBalance: balance,
    };
  }
}
