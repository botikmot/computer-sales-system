import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';
import { PrismaService } from '../database/prisma.service.js';

import { CreatePettyCashFundDto } from './dto/create-petty-cash-fund.dto.js';
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto.js';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto.js';

@Injectable()
export class PettyCashService {
  constructor(private readonly prisma: PrismaService) {}

  async createFund(dto: CreatePettyCashFundDto) {
    const openingBalance = new Prisma.Decimal(dto.openingBalance);

    if (openingBalance.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Opening balance must be greater than zero.',
      );
    }

    const branch = await this.prisma.branch.findUnique({
      where: {
        id: dto.branchId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    if (dto.custodianId) {
      const custodian = await this.prisma.user.findUnique({
        where: {
          id: dto.custodianId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!custodian) {
        throw new NotFoundException('Petty cash custodian not found.');
      }

      if (custodian.status !== 'ACTIVE') {
        throw new BadRequestException('Petty cash custodian is inactive.');
      }
    }

    const fundNo = `PC-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return this.prisma.pettyCashFund.create({
      data: {
        fundNo,
        branchId: dto.branchId,
        name: dto.name.trim(),
        custodianId: dto.custodianId ?? null,
        openingBalance,
        currentBalance: openingBalance,
      },
    });
  }

  async findFunds(branchId?: string) {
    return this.prisma.pettyCashFund.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
      },
      include: {
        custodian: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findFund(id: string) {
    const fund = await this.prisma.pettyCashFund.findUnique({
      where: {
        id,
      },
      include: {
        custodian: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        vouchers: {
          orderBy: {
            expenseDate: 'desc',
          },
        },
        replenishments: {
          orderBy: {
            replenishmentDate: 'desc',
          },
        },
      },
    });

    if (!fund) {
      throw new NotFoundException('Petty cash fund not found.');
    }

    return fund;
  }

  async createVoucher(fundId: string, dto: CreatePettyCashVoucherDto) {
    const fund = await this.prisma.pettyCashFund.findUnique({
      where: {
        id: fundId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!fund) {
      throw new NotFoundException('Petty cash fund not found.');
    }

    if (fund.status !== 'ACTIVE') {
      throw new BadRequestException('Petty cash fund is inactive.');
    }

    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Voucher amount must be greater than zero.',
      );
    }

    const voucherNo = `PCV-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return this.prisma.pettyCashVoucher.create({
      data: {
        voucherNo,
        fundId,
        expenseDate: new Date(dto.expenseDate),
        description: dto.description.trim(),
        amount,
        category: dto.category.trim(),
        payee: dto.payee?.trim() || null,
        referenceNo: dto.referenceNo?.trim() || null,
      },
    });
  }

  async postVoucher(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.pettyCashVoucher.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          fundId: true,
          amount: true,
          status: true,
        },
      });

      if (!voucher) {
        throw new NotFoundException('Petty cash voucher not found.');
      }

      if (voucher.status !== 'DRAFT') {
        throw new BadRequestException('Only draft vouchers can be posted.');
      }

      const fund = await tx.pettyCashFund.findUnique({
        where: {
          id: voucher.fundId,
        },
        select: {
          id: true,
          currentBalance: true,
          status: true,
        },
      });

      if (!fund) {
        throw new NotFoundException('Petty cash fund not found.');
      }

      if (fund.status !== 'ACTIVE') {
        throw new BadRequestException('Petty cash fund is inactive.');
      }

      if (fund.currentBalance.lessThan(voucher.amount)) {
        throw new BadRequestException(
          `Insufficient petty cash balance. Available: ${fund.currentBalance.toFixed(
            2,
          )}.`,
        );
      }

      const newBalance = fund.currentBalance
        .sub(voucher.amount)
        .toDecimalPlaces(2);

      await tx.pettyCashFund.update({
        where: {
          id: fund.id,
        },
        data: {
          currentBalance: newBalance,
        },
      });

      return tx.pettyCashVoucher.update({
        where: {
          id: voucher.id,
        },
        data: {
          status: 'POSTED',
        },
      });
    });
  }

  async voidVoucher(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.pettyCashVoucher.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          fundId: true,
          amount: true,
          status: true,
        },
      });

      if (!voucher) {
        throw new NotFoundException('Petty cash voucher not found.');
      }

      if (voucher.status !== 'POSTED') {
        throw new BadRequestException('Only posted vouchers can be voided.');
      }

      const fund = await tx.pettyCashFund.findUnique({
        where: {
          id: voucher.fundId,
        },
        select: {
          id: true,
          currentBalance: true,
        },
      });

      if (!fund) {
        throw new NotFoundException('Petty cash fund not found.');
      }

      const newBalance = fund.currentBalance
        .add(voucher.amount)
        .toDecimalPlaces(2);

      await tx.pettyCashFund.update({
        where: {
          id: fund.id,
        },
        data: {
          currentBalance: newBalance,
        },
      });

      return tx.pettyCashVoucher.update({
        where: {
          id: voucher.id,
        },
        data: {
          status: 'VOIDED',
        },
      });
    });
  }

  async createReplenishment(
    fundId: string,
    dto: CreatePettyCashReplenishmentDto,
  ) {
    const fund = await this.prisma.pettyCashFund.findUnique({
      where: {
        id: fundId,
      },
      select: {
        id: true,
        branchId: true,
        openingBalance: true,
        currentBalance: true,
        status: true,
      },
    });

    if (!fund) {
      throw new NotFoundException('Petty cash fund not found.');
    }

    if (fund.status !== 'ACTIVE') {
      throw new BadRequestException('Petty cash fund is inactive.');
    }

    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Replenishment amount must be greater than zero.',
      );
    }

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

    if (account.branchId !== fund.branchId) {
      throw new BadRequestException(
        'Cash/Bank account does not belong to the petty cash branch.',
      );
    }

    if (!account.isActive) {
      throw new BadRequestException('Cash/Bank account is inactive.');
    }

    const maximumReplenishment = fund.openingBalance
      .sub(fund.currentBalance)
      .toDecimalPlaces(2);

    if (amount.greaterThan(maximumReplenishment)) {
      throw new BadRequestException(
        `Replenishment cannot exceed the fund shortfall of ${maximumReplenishment.toFixed(
          2,
        )}.`,
      );
    }

    const replenishmentNo = `PCR-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    return this.prisma.pettyCashReplenishment.create({
      data: {
        replenishmentNo,
        fundId,
        accountId: dto.accountId,
        replenishmentDate: new Date(dto.replenishmentDate),
        amount,
        referenceNo: dto.referenceNo?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async postReplenishment(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const replenishment = await tx.pettyCashReplenishment.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          replenishmentNo: true,
          fundId: true,
          accountId: true,
          amount: true,
          replenishmentDate: true,
          referenceNo: true,
          notes: true,
          status: true,
        },
      });

      if (!replenishment) {
        throw new NotFoundException('Petty cash replenishment not found.');
      }

      if (replenishment.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only draft replenishments can be posted.',
        );
      }

      const fund = await tx.pettyCashFund.findUnique({
        where: {
          id: replenishment.fundId,
        },
        select: {
          id: true,
          branchId: true,
          openingBalance: true,
          currentBalance: true,
          status: true,
        },
      });

      if (!fund) {
        throw new NotFoundException('Petty cash fund not found.');
      }

      if (fund.status !== 'ACTIVE') {
        throw new BadRequestException('Petty cash fund is inactive.');
      }

      const account = await tx.cashBankAccount.findUnique({
        where: {
          id: replenishment.accountId,
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

      if (account.branchId !== fund.branchId) {
        throw new BadRequestException(
          'Cash/Bank account does not belong to the petty cash branch.',
        );
      }

      if (!account.isActive) {
        throw new BadRequestException('Cash/Bank account is inactive.');
      }

      const newBalance = fund.currentBalance
        .add(replenishment.amount)
        .toDecimalPlaces(2);

      if (newBalance.greaterThan(fund.openingBalance)) {
        throw new BadRequestException(
          'Replenishment would exceed the petty cash fund opening balance.',
        );
      }

      await tx.pettyCashFund.update({
        where: {
          id: fund.id,
        },
        data: {
          currentBalance: newBalance,
        },
      });

      await tx.cashBankTransaction.create({
        data: {
          branchId: fund.branchId,
          accountId: account.id,
          accountType: account.accountType,
          accountName: account.name,
          transactionType: 'PETTY_CASH_REPLENISHMENT',
          direction: 'OUT',
          amount: replenishment.amount,
          transactionDate: replenishment.replenishmentDate,
          referenceNo:
            replenishment.referenceNo ?? replenishment.replenishmentNo,
          notes:
            replenishment.notes ??
            `Petty cash replenishment ${replenishment.replenishmentNo}`,
          pettyCashReplenishmentId: replenishment.id,
        },
      });

      return tx.pettyCashReplenishment.update({
        where: {
          id: replenishment.id,
        },
        data: {
          status: 'POSTED',
        },
      });
    });
  }

  async findVouchers(fundId: string) {
    return this.prisma.pettyCashVoucher.findMany({
      where: {
        fundId,
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });
  }

  async findReplenishments(fundId: string) {
    return this.prisma.pettyCashReplenishment.findMany({
      where: {
        fundId,
      },
      include: {
        account: true,
      },
      orderBy: {
        replenishmentDate: 'desc',
      },
    });
  }
}
