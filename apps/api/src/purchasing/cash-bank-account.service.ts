import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import { CreateCashBankAccountDto } from './dto/create-cash-bank-account.dto.js';

@Injectable()
export class CashBankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCashBankAccountDto) {
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

  async findAll() {
    return this.prisma.cashBankAccount.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    return account;
  }

  async getBalance(id: string) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!account) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    const result = await this.prisma.cashBankTransaction.aggregate({
      where: {
        accountId: id,
      },
      _sum: {
        amount: true,
      },
    });

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
