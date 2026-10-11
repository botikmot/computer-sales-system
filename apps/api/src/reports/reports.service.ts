import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@computer-sales/database';
import { PrismaService } from '../database/prisma.service.js';
import { CashBankReportQueryDto } from './dto/cash-bank-report-query.dto.js';
import { PettyCashReportQueryDto } from './dto/petty-cash-report-query.dto.js';
import { AccountsReceivableReportQueryDto } from './dto/accounts-receivable-report-query.dto.js';
import { AccountsPayableReportQueryDto } from './dto/accounts-payable-report-query.dto.js';
import { SalesReportQueryDto } from './dto/sales-report-query.dto.js';
import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';
import { ManagementReportQueryDto } from './dto/management-report-query.dto.js';
import { PurchasingReportQueryDto } from './dto/purchasing-report-query.dto.js';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto.js';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private scopeReportQuery<T extends { branchId?: string }>(
    query: T,
    user: AuthenticatedUser,
  ): T {
    /*
     * ADMIN may optionally request a specific branch or all branches.
     */
    if (user.role === UserRole.ADMIN) {
      if (query.branchId) {
        this.branchAccessService.assertCanAccessBranch(user, query.branchId);
      }

      return query;
    }

    /*
     * Non-admin users must have an assigned branch.
     */
    this.branchAccessService.assertCanAccessOptionalBranch(
      user,
      query.branchId,
    );

    /*
     * Force every report query to the user's actual branch.
     */
    return {
      ...query,
      branchId: user.branchId!,
    };
  }

  private getRequiredManagementPeriod(query: ManagementReportQueryDto) {
    if (!query.from || !query.to) {
      throw new BadRequestException('from and to are required.');
    }

    const dateRange = this.getOptionalDateRange(query.from, query.to);

    if (!dateRange) {
      throw new BadRequestException('Invalid date range.');
    }

    return dateRange;
  }

  private getManagementAsOfDate(value?: string) {
    const date = value ? new Date(`${value}T23:59:59.999Z`) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid asOfDate.');
    }

    return date;
  }

  async incomeStatement(
    query: ManagementReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);
    const dateRange = this.getRequiredManagementPeriod(query);

    const [
      salesAggregate,
      returnsAggregate,
      serviceAggregate,
      saleCogsAggregate,
      salesReturnCogsAggregate,
      repairPartsAggregate,
      expenseAggregate,
      pettyExpenseAggregate,
    ] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: {
          status: 'POSTED',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          invoiceDate: dateRange,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.salesReturn.aggregate({
        where: {
          status: 'POSTED',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          returnDate: dateRange,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.serviceInvoice.aggregate({
        where: {
          status: 'POSTED',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          invoiceDate: dateRange,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.inventoryMovement.aggregate({
        where: {
          type: 'SALE_OUT',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          createdAt: dateRange,
        },
        _sum: {
          totalCost: true,
        },
      }),

      this.prisma.inventoryMovement.aggregate({
        where: {
          type: 'SALES_RETURN',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          createdAt: dateRange,
        },
        _sum: {
          totalCost: true,
        },
      }),

      this.prisma.serviceJobPart.aggregate({
        where: {
          issuedQuantity: {
            gt: 0,
          },
          serviceJob: {
            ...(query.branchId ? { branchId: query.branchId } : {}),
            invoice: {
              status: 'POSTED',
              invoiceDate: dateRange,
            },
          },
        },
        _sum: {
          totalCost: true,
        },
      }),

      this.prisma.cashBankTransaction.aggregate({
        where: {
          transactionType: 'EXPENSE',
          direction: 'OUT',
          ...(query.branchId ? { branchId: query.branchId } : {}),
          transactionDate: dateRange,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.pettyCashVoucher.aggregate({
        where: {
          status: 'POSTED',
          ...(query.branchId
            ? {
                fund: {
                  branchId: query.branchId,
                },
              }
            : {}),
          expenseDate: dateRange,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const salesRevenue = salesAggregate._sum.total ?? new Prisma.Decimal(0);

    const salesReturns = returnsAggregate._sum.total ?? new Prisma.Decimal(0);

    const serviceRevenue = serviceAggregate._sum.total ?? new Prisma.Decimal(0);

    const netSalesRevenue = salesRevenue.sub(salesReturns);

    const totalRevenue = netSalesRevenue.add(serviceRevenue);

    const saleOutCogs =
      saleCogsAggregate._sum.totalCost ?? new Prisma.Decimal(0);

    const salesReturnCogs =
      salesReturnCogsAggregate._sum.totalCost ?? new Prisma.Decimal(0);

    const salesCogs = saleOutCogs.sub(salesReturnCogs);

    const repairPartsCost =
      repairPartsAggregate._sum.totalCost ?? new Prisma.Decimal(0);

    const totalCogs = salesCogs.add(repairPartsCost);

    const grossProfit = totalRevenue.sub(totalCogs);

    const cashExpenses = expenseAggregate._sum.amount ?? new Prisma.Decimal(0);

    const pettyCashExpenses =
      pettyExpenseAggregate._sum.amount ?? new Prisma.Decimal(0);

    const operatingExpenses = cashExpenses.add(pettyCashExpenses);

    const estimatedNetIncome = grossProfit.sub(operatingExpenses);

    const grossMargin = totalRevenue.gt(0)
      ? grossProfit.div(totalRevenue).mul(100)
      : new Prisma.Decimal(0);

    return {
      from: query.from,
      to: query.to,

      revenue: {
        sales: salesRevenue.toDecimalPlaces(2),
        salesReturns: salesReturns.toDecimalPlaces(2),
        netSales: netSalesRevenue.toDecimalPlaces(2),
        service: serviceRevenue.toDecimalPlaces(2),
        total: totalRevenue.toDecimalPlaces(2),
      },

      costOfSales: {
        salesCogs: salesCogs.toDecimalPlaces(2),
        repairPartsCost: repairPartsCost.toDecimalPlaces(2),
        total: totalCogs.toDecimalPlaces(2),
      },

      grossProfit: grossProfit.toDecimalPlaces(2),

      grossMargin: grossMargin.toDecimalPlaces(2),

      operatingExpenses: {
        cashExpenses: cashExpenses.toDecimalPlaces(2),
        pettyCashExpenses: pettyCashExpenses.toDecimalPlaces(2),
        total: operatingExpenses.toDecimalPlaces(2),
      },

      estimatedNetIncome: estimatedNetIncome.toDecimalPlaces(2),
    };
  }

  private getSalesDateRange(query: SalesReportQueryDto) {
    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(`${query.date}T23:59:59.999Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date.');
      }

      return { start, end };
    }

    if (query.year && query.month) {
      const start = new Date(
        Date.UTC(query.year, query.month - 1, 1, 0, 0, 0, 0),
      );

      const end = new Date(
        Date.UTC(query.year, query.month, 0, 23, 59, 59, 999),
      );

      return { start, end };
    }

    if (query.from || query.to) {
      const start = query.from
        ? new Date(`${query.from}T00:00:00.000Z`)
        : undefined;

      const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;

      if (
        (start && Number.isNaN(start.getTime())) ||
        (end && Number.isNaN(end.getTime()))
      ) {
        throw new BadRequestException('Invalid sales date range.');
      }

      if (start && end && start > end) {
        throw new BadRequestException('from date cannot be after to date.');
      }

      return {
        start,
        end,
      };
    }

    throw new BadRequestException('Provide date, year/month, or from/to.');
  }

  private getOptionalDateRange(from?: string, to?: string) {
    if (!from && !to) {
      return undefined;
    }

    const start = from ? new Date(`${from}T00:00:00.000Z`) : undefined;

    const end = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

    if (
      (start && Number.isNaN(start.getTime())) ||
      (end && Number.isNaN(end.getTime()))
    ) {
      throw new BadRequestException('Invalid date range.');
    }

    if (start && end && start > end) {
      throw new BadRequestException('from date cannot be after to date.');
    }

    return {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    };
  }

  private getDayRange(date?: string) {
    if (!date) {
      throw new BadRequestException('date is required.');
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date.');
    }

    return { start, end };
  }

  private getDateRange(query: CashBankReportQueryDto) {
    if (!query.from || !query.to) {
      throw new BadRequestException('from and to are required.');
    }

    const start = new Date(`${query.from}T00:00:00.000Z`);
    const end = new Date(`${query.to}T23:59:59.999Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range.');
    }

    if (start > end) {
      throw new BadRequestException('from date cannot be after to date.');
    }

    return { start, end };
  }

  private buildTransactionWhere(
    query: CashBankReportQueryDto,
    start: Date,
    end: Date,
    direction?: 'IN' | 'OUT',
    accountType?: 'CASH' | 'BANK',
  ): Prisma.CashBankTransactionWhereInput {
    return {
      ...(query.branchId ? { branchId: query.branchId } : {}),

      ...(query.accountId ? { accountId: query.accountId } : {}),

      ...(direction ? { direction } : {}),

      ...(accountType ? { accountType } : {}),

      transactionDate: {
        gte: start,
        lte: end,
      },
    };
  }

  async dailyCashReport(
    query: CashBankReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getDayRange(query.date);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const accountWhere: Prisma.CashBankAccountWhereInput = {
      accountType: 'CASH',
      isActive: true,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.accountId ? { id: query.accountId } : {}),
    };

    const [accountIds, accountCount, accounts, openingAggregate] =
      await Promise.all([
        this.prisma.cashBankAccount.findMany({
          where: accountWhere,
          select: {
            id: true,
          },
        }),

        this.prisma.cashBankAccount.count({
          where: accountWhere,
        }),

        this.prisma.cashBankAccount.findMany({
          where: accountWhere,
          select: {
            id: true,
            branchId: true,
            name: true,
            accountNumber: true,
            openingBalance: true,
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip,
          take: limit,
        }),

        this.prisma.cashBankAccount.aggregate({
          where: accountWhere,
          _sum: {
            openingBalance: true,
          },
        }),
      ]);

    const allAccountIds = accountIds.map((account) => account.id);
    const pageAccountIds = accounts.map((account) => account.id);

    const [
      historicalTotals,
      dailyTotals,
      accountHistoricalTotals,
      accountDailyTotals,
    ] = await Promise.all([
      this.prisma.cashBankTransaction.groupBy({
        by: ['direction'],
        where: {
          accountId: { in: allAccountIds },
          transactionDate: { lt: start },
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.cashBankTransaction.groupBy({
        by: ['direction'],
        where: {
          accountId: { in: allAccountIds },
          transactionDate: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.cashBankTransaction.groupBy({
        by: ['accountId', 'direction'],
        where: {
          accountId: { in: pageAccountIds },
          transactionDate: { lt: start },
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.cashBankTransaction.groupBy({
        by: ['accountId', 'direction'],
        where: {
          accountId: { in: pageAccountIds },
          transactionDate: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const amountByDirection = (
      rows: typeof historicalTotals,
      direction: 'IN' | 'OUT',
    ) =>
      rows.find((row) => row.direction === direction)?._sum.amount ??
      new Prisma.Decimal(0);

    const accountAmount = (
      rows: typeof accountHistoricalTotals,
      accountId: string,
      direction: 'IN' | 'OUT',
    ) =>
      rows.find(
        (row) => row.accountId === accountId && row.direction === direction,
      )?._sum.amount ?? new Prisma.Decimal(0);

    const openingBalance = (
      openingAggregate._sum.openingBalance ?? new Prisma.Decimal(0)
    )
      .add(amountByDirection(historicalTotals, 'IN'))
      .sub(amountByDirection(historicalTotals, 'OUT'))
      .toDecimalPlaces(2);

    const cashReceipts = amountByDirection(dailyTotals, 'IN').toDecimalPlaces(
      2,
    );

    const cashDisbursements = amountByDirection(
      dailyTotals,
      'OUT',
    ).toDecimalPlaces(2);

    const closingBalance = openingBalance
      .add(cashReceipts)
      .sub(cashDisbursements)
      .toDecimalPlaces(2);

    const accountRows = accounts.map((account) => {
      const opening = account.openingBalance
        .add(accountAmount(accountHistoricalTotals, account.id, 'IN'))
        .sub(accountAmount(accountHistoricalTotals, account.id, 'OUT'))
        .toDecimalPlaces(2);

      const receipts = accountAmount(
        accountDailyTotals,
        account.id,
        'IN',
      ).toDecimalPlaces(2);

      const disbursements = accountAmount(
        accountDailyTotals,
        account.id,
        'OUT',
      ).toDecimalPlaces(2);

      return {
        ...account,
        configuredOpeningBalance: account.openingBalance.toDecimalPlaces(2),
        openingBalance: opening,
        cashReceipts: receipts,
        cashDisbursements: disbursements,
        closingBalance: opening
          .add(receipts)
          .sub(disbursements)
          .toDecimalPlaces(2),
      };
    });

    return {
      date: query.date ?? start.toISOString().slice(0, 10),
      openingBalance,
      cashReceipts,
      cashDisbursements,
      closingBalance,
      count: accountCount,
      accounts: accountRows,
      pagination: {
        page,
        limit,
        total: accountCount,
        pages: Math.max(1, Math.ceil(accountCount / limit)),
      },
    };
  }

  async cashReceipts(query: CashBankReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getDateRange(query);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where = this.buildTransactionWhere(query, start, end, 'IN', 'CASH');

    const [transactions, count, aggregate] = await Promise.all([
      this.prisma.cashBankTransaction.findMany({
        where,
        include: {
          account: true,
          branch: true,
        },
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),

      this.prisma.cashBankTransaction.count({
        where,
      }),

      this.prisma.cashBankTransaction.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      total,
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async cashDisbursements(
    query: CashBankReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getDateRange(query);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where = this.buildTransactionWhere(query, start, end, 'OUT', 'CASH');

    const [transactions, count, aggregate] = await Promise.all([
      this.prisma.cashBankTransaction.findMany({
        where,
        include: {
          account: true,
          branch: true,
        },
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),

      this.prisma.cashBankTransaction.count({
        where,
      }),

      this.prisma.cashBankTransaction.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      total,
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async bankTransactions(
    query: CashBankReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getDateRange(query);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where = this.buildTransactionWhere(
      query,
      start,
      end,
      undefined,
      'BANK',
    );

    const inWhere = this.buildTransactionWhere(query, start, end, 'IN', 'BANK');

    const outWhere = this.buildTransactionWhere(
      query,
      start,
      end,
      'OUT',
      'BANK',
    );

    const [transactions, count, totalInAggregate, totalOutAggregate] =
      await Promise.all([
        this.prisma.cashBankTransaction.findMany({
          where,
          include: {
            account: true,
            branch: true,
          },
          orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),

        this.prisma.cashBankTransaction.count({ where }),

        this.prisma.cashBankTransaction.aggregate({
          where: inWhere,
          _sum: { amount: true },
        }),

        this.prisma.cashBankTransaction.aggregate({
          where: outWhere,
          _sum: { amount: true },
        }),
      ]);

    const totalIn = (
      totalInAggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    const totalOut = (
      totalOutAggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    const net = totalIn.sub(totalOut).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      totalIn,
      totalOut,
      net,
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async bankReconciliation(
    query: CashBankReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BankReconciliationWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      account: {
        is: {
          accountType: 'BANK',
        },
      },
    };

    if (query.from || query.to) {
      const start = query.from
        ? new Date(`${query.from}T00:00:00.000Z`)
        : undefined;

      const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;

      where.statementDate = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const [reconciliations, count, statusGroups] = await Promise.all([
      this.prisma.bankReconciliation.findMany({
        where,
        include: {
          account: true,
          branch: true,
          items: {
            include: {
              cashBankTransaction: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: [{ statementDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),

      this.prisma.bankReconciliation.count({ where }),

      this.prisma.bankReconciliation.groupBy({
        by: ['status'],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      reconciliations,
      statusCounts: statusGroups.map((group) => ({
        status: group.status,
        count: group._count._all,
      })),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async pettyCashVouchers(
    query: PettyCashReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const expenseDate = this.getOptionalDateRange(query.from, query.to);

    const where: Prisma.PettyCashVoucherWhereInput = {
      status: 'POSTED',

      ...(query.fundId ? { fundId: query.fundId } : {}),

      ...(expenseDate ? { expenseDate } : {}),

      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    const requestedPage = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const [count, aggregate] = await Promise.all([
      this.prisma.pettyCashVoucher.count({ where }),

      this.prisma.pettyCashVoucher.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const pages = Math.max(1, Math.ceil(count / limit));
    const page = Math.min(requestedPage, pages);
    const skip = (page - 1) * limit;

    const vouchers = await this.prisma.pettyCashVoucher.findMany({
      where,
      include: {
        fund: {
          include: {
            branch: true,
          },
        },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    });

    const total = (
      aggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      total,
      vouchers,
      pagination: {
        page,
        limit,
        total: count,
        pages,
      },
    };
  }

  async pettyCashReplenishments(
    query: PettyCashReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const replenishmentDate = this.getOptionalDateRange(query.from, query.to);

    // Normalize pagination and enforce the maximum page size.
    const page = Math.max(1, Math.trunc(Number(query.page) || 1));

    const limit = Math.min(
      100,
      Math.max(1, Math.trunc(Number(query.limit) || 10)),
    );

    const skip = (page - 1) * limit;

    // Keep all existing report filters in one shared query.
    const where = {
      status: 'POSTED' as const,

      ...(query.fundId ? { fundId: query.fundId } : {}),

      ...(replenishmentDate ? { replenishmentDate } : {}),

      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    // Fetch the current page, count all matching records,
    // and aggregate the amount across all matching records.
    const [replenishments, count, aggregate] = await Promise.all([
      this.prisma.pettyCashReplenishment.findMany({
        where,
        include: {
          fund: true,
          account: true,
          cashBankTransaction: true,
        },
        orderBy: [
          {
            replenishmentDate: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        skip,
        take: limit,
      }),

      this.prisma.pettyCashReplenishment.count({
        where,
      }),

      this.prisma.pettyCashReplenishment.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = aggregate._sum.amount ?? new Prisma.Decimal(0);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      total: total.toDecimalPlaces(2),
      replenishments,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async pettyCashTransactions(
    query: PettyCashReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const expenseDate = this.getOptionalDateRange(query.from, query.to);

    const replenishmentDate = this.getOptionalDateRange(query.from, query.to);

    const limit = Math.min(query.limit ?? 10, 100);
    const requestedPage = query.page ?? 1;

    const voucherWhere: Prisma.PettyCashVoucherWhereInput = {
      status: 'POSTED',

      ...(query.fundId ? { fundId: query.fundId } : {}),

      ...(expenseDate ? { expenseDate } : {}),

      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    const replenishmentWhere: Prisma.PettyCashReplenishmentWhereInput = {
      status: 'POSTED',

      ...(query.fundId ? { fundId: query.fundId } : {}),

      ...(replenishmentDate ? { replenishmentDate } : {}),

      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    // Counts and totals cover the full filtered dataset,
    // not only the current page.
    const [
      voucherCount,
      replenishmentCount,
      voucherAggregate,
      replenishmentAggregate,
    ] = await Promise.all([
      this.prisma.pettyCashVoucher.count({
        where: voucherWhere,
      }),

      this.prisma.pettyCashReplenishment.count({
        where: replenishmentWhere,
      }),

      this.prisma.pettyCashVoucher.aggregate({
        where: voucherWhere,
        _sum: {
          amount: true,
        },
      }),

      this.prisma.pettyCashReplenishment.aggregate({
        where: replenishmentWhere,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const count = voucherCount + replenishmentCount;
    const totalPages = Math.max(1, Math.ceil(count / limit));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * limit;

    /*
     * Vouchers and replenishments are different Prisma models.
     * Fetch only the rows needed to build the requested combined
     * page, then merge and paginate on the server.
     */
    const fetchLimit = offset + limit;

    const [vouchers, replenishments] = await Promise.all([
      this.prisma.pettyCashVoucher.findMany({
        where: voucherWhere,

        select: {
          id: true,
          voucherNo: true,
          fundId: true,
          expenseDate: true,
          description: true,
          amount: true,
          category: true,
          payee: true,
          referenceNo: true,

          fund: {
            select: {
              fundNo: true,
              name: true,
              branchId: true,
              branch: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },

        orderBy: [{ expenseDate: 'desc' }, { id: 'asc' }],

        take: fetchLimit,
      }),

      this.prisma.pettyCashReplenishment.findMany({
        where: replenishmentWhere,

        select: {
          id: true,
          replenishmentNo: true,
          fundId: true,
          replenishmentDate: true,
          amount: true,
          referenceNo: true,
          notes: true,

          fund: {
            select: {
              fundNo: true,
              name: true,
              branchId: true,
              branch: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },

        orderBy: [{ replenishmentDate: 'desc' }, { id: 'asc' }],

        take: fetchLimit,
      }),
    ]);

    const transactions = [
      ...vouchers.map((voucher) => ({
        id: voucher.id,
        type: 'VOUCHER' as const,
        referenceNo: voucher.voucherNo,
        date: voucher.expenseDate,
        description: voucher.description,
        category: voucher.category,
        payee: voucher.payee,
        amount: voucher.amount,
        direction: 'OUT' as const,
        fundId: voucher.fundId,
        fundNo: voucher.fund.fundNo,
        fundName: voucher.fund.name,
        branchId: voucher.fund.branchId,
        branchCode: voucher.fund.branch.code,
        branchName: voucher.fund.branch.name,
        sourceReferenceNo: voucher.referenceNo,
      })),

      ...replenishments.map((replenishment) => ({
        id: replenishment.id,
        type: 'REPLENISHMENT' as const,
        referenceNo: replenishment.replenishmentNo,
        date: replenishment.replenishmentDate,
        description:
          replenishment.notes ??
          `Petty cash replenishment ${replenishment.replenishmentNo}`,
        category: 'REPLENISHMENT',
        payee: null,
        amount: replenishment.amount,
        direction: 'IN' as const,
        fundId: replenishment.fundId,
        fundNo: replenishment.fund.fundNo,
        fundName: replenishment.fund.name,
        branchId: replenishment.fund.branchId,
        branchCode: replenishment.fund.branch.code,
        branchName: replenishment.fund.branch.name,
        sourceReferenceNo: replenishment.referenceNo,
      })),
    ].sort(
      (a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id),
    );

    const paginatedTransactions = transactions.slice(offset, offset + limit);

    const totalIn = replenishmentAggregate._sum.amount ?? new Prisma.Decimal(0);

    const totalOut = voucherAggregate._sum.amount ?? new Prisma.Decimal(0);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      totalIn: totalIn.toDecimalPlaces(2),
      totalOut: totalOut.toDecimalPlaces(2),
      net: totalIn.sub(totalOut).toDecimalPlaces(2),

      transactions: paginatedTransactions,

      pagination: {
        page,
        limit,
        total: count,
        pages: totalPages,
      },
    };
  }

  async pettyCashBalance(
    query: PettyCashReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const fundWhere: Prisma.PettyCashFundWhereInput = {
      ...(query.fundId ? { id: query.fundId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const voucherWhere: Prisma.PettyCashVoucherWhereInput = {
      status: 'POSTED',
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    const replenishmentWhere: Prisma.PettyCashReplenishmentWhereInput = {
      status: 'POSTED',
      ...(query.fundId ? { fundId: query.fundId } : {}),
      ...(query.branchId
        ? {
            fund: {
              branchId: query.branchId,
            },
          }
        : {}),
    };

    const [funds, totalCount, fundTotals, voucherTotals, replenishmentTotals] =
      await Promise.all([
        this.prisma.pettyCashFund.findMany({
          where: fundWhere,
          orderBy: {
            createdAt: 'asc',
          },
          skip,
          take: limit,
        }),

        this.prisma.pettyCashFund.count({
          where: fundWhere,
        }),

        this.prisma.pettyCashFund.aggregate({
          where: fundWhere,
          _sum: {
            openingBalance: true,
            currentBalance: true,
          },
        }),

        this.prisma.pettyCashVoucher.aggregate({
          where: voucherWhere,
          _sum: {
            amount: true,
          },
        }),

        this.prisma.pettyCashReplenishment.aggregate({
          where: replenishmentWhere,
          _sum: {
            amount: true,
          },
        }),
      ]);

    const balances = await Promise.all(
      funds.map(async (fund) => {
        const [vouchers, replenishments] = await Promise.all([
          this.prisma.pettyCashVoucher.aggregate({
            where: {
              fundId: fund.id,
              status: 'POSTED',
            },
            _sum: {
              amount: true,
            },
          }),

          this.prisma.pettyCashReplenishment.aggregate({
            where: {
              fundId: fund.id,
              status: 'POSTED',
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        return {
          fundId: fund.id,
          fundNo: fund.fundNo,
          name: fund.name,
          branchId: fund.branchId,
          status: fund.status,
          openingBalance: fund.openingBalance,
          currentBalance: fund.currentBalance,
          totalExpenses: (
            vouchers._sum.amount ?? new Prisma.Decimal(0)
          ).toDecimalPlaces(2),
          totalReplenishments: (
            replenishments._sum.amount ?? new Prisma.Decimal(0)
          ).toDecimalPlaces(2),
        };
      }),
    );

    return {
      count: totalCount,
      funds: balances,

      summary: {
        openingBalance: (
          fundTotals._sum.openingBalance ?? new Prisma.Decimal(0)
        ).toDecimalPlaces(2),

        currentBalance: (
          fundTotals._sum.currentBalance ?? new Prisma.Decimal(0)
        ).toDecimalPlaces(2),

        totalExpenses: (
          voucherTotals._sum.amount ?? new Prisma.Decimal(0)
        ).toDecimalPlaces(2),

        totalReplenishments: (
          replenishmentTotals._sum.amount ?? new Prisma.Decimal(0)
        ).toDecimalPlaces(2),
      },

      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  async accountsReceivableCustomerBalances(
    query: AccountsReceivableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const receivableWhere: Prisma.AccountsReceivableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };

    const customerWhere: Prisma.CustomerWhereInput = {
      ...(query.customerId ? { id: query.customerId } : {}),

      accountsReceivables: {
        some: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
      },
    };

    const [customers, customerCount, receivableTotals] = await Promise.all([
      this.prisma.customer.findMany({
        where: customerWhere,

        orderBy: [{ name: 'asc' }, { id: 'asc' }],

        skip,
        take: limit,
      }),

      this.prisma.customer.count({
        where: customerWhere,
      }),

      this.prisma.accountsReceivable.aggregate({
        where: receivableWhere,

        _count: {
          _all: true,
        },

        _sum: {
          originalAmount: true,
          amountPaid: true,
          balanceDue: true,
        },
      }),
    ]);

    const customerIds = customers.map((customer) => customer.id);

    const grouped = customerIds.length
      ? await this.prisma.accountsReceivable.groupBy({
          by: ['customerId'],

          where: {
            ...receivableWhere,
            customerId: {
              in: customerIds,
            },
          },

          _count: {
            _all: true,
          },

          _sum: {
            originalAmount: true,
            amountPaid: true,
            balanceDue: true,
          },
        })
      : [];

    const groupedByCustomer = new Map<string, (typeof grouped)[number]>();

    for (const item of grouped) {
      groupedByCustomer.set(item.customerId, item);
    }

    const toMoney = (value: Prisma.Decimal | null | undefined) =>
      (value ?? new Prisma.Decimal(0)).toDecimalPlaces(2);

    const customerRows = customers.map((customer) => {
      const aggregate = groupedByCustomer.get(customer.id);

      return {
        customer,

        invoiceCount: aggregate?._count._all ?? 0,

        originalAmount: toMoney(aggregate?._sum.originalAmount),

        amountPaid: toMoney(aggregate?._sum.amountPaid),

        balanceDue: toMoney(aggregate?._sum.balanceDue),
      };
    });

    return {
      count: customerCount,
      customers: customerRows,

      totals: {
        customerCount,
        receivableCount: receivableTotals._count._all,

        originalAmount: toMoney(receivableTotals._sum.originalAmount),

        amountPaid: toMoney(receivableTotals._sum.amountPaid),

        balanceDue: toMoney(receivableTotals._sum.balanceDue),
      },

      pagination: {
        page,
        limit,
        total: customerCount,
        pages: Math.max(1, Math.ceil(customerCount / limit)),
      },
    };
  }

  async outstandingReceivables(
    query: AccountsReceivableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AccountsReceivableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      status: {
        in: ['OPEN', 'PARTIALLY_PAID'],
      },
      balanceDue: {
        gt: 0,
      },
    };

    const [records, count, aggregate] = await Promise.all([
      this.prisma.accountsReceivable.findMany({
        where,
        include: {
          customer: true,
          salesInvoice: true,
          serviceInvoice: true,
        },
        orderBy: [
          {
            dueDate: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
        skip,
        take: limit,
      }),

      this.prisma.accountsReceivable.count({
        where,
      }),

      this.prisma.accountsReceivable.aggregate({
        where,
        _sum: {
          balanceDue: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.balanceDue ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      count,
      total,
      records,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async agingOfReceivables(
    query: AccountsReceivableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const asOfDate = query.asOfDate
      ? query.asOfDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const asOfStart = new Date(`${asOfDate}T00:00:00.000Z`);

    if (
      Number.isNaN(asOfStart.getTime()) ||
      asOfStart.toISOString().slice(0, 10) !== asOfDate
    ) {
      throw new BadRequestException('Invalid asOfDate.');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const shiftDays = (days: number) => {
      const date = new Date(asOfStart);
      date.setUTCDate(date.getUTCDate() + days);
      return date;
    };

    const days30Ago = shiftDays(-30);
    const days60Ago = shiftDays(-60);
    const days90Ago = shiftDays(-90);

    const where: Prisma.AccountsReceivableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      status: {
        in: ['OPEN', 'PARTIALLY_PAID'],
      },
      balanceDue: {
        gt: 0,
      },
    };

    const sumByBucket = async (
      bucketWhere: Prisma.AccountsReceivableWhereInput,
    ) => {
      const result = await this.prisma.accountsReceivable.aggregate({
        where: {
          ...where,
          ...bucketWhere,
        },
        _sum: {
          balanceDue: true,
        },
      });

      return (result._sum.balanceDue ?? new Prisma.Decimal(0)).toDecimalPlaces(
        2,
      );
    };

    const [
      records,
      count,
      totalAggregate,
      current,
      days1To30,
      days31To60,
      days61To90,
      days91Plus,
      noDueDate,
    ] = await Promise.all([
      this.prisma.accountsReceivable.findMany({
        where,
        include: {
          customer: true,
          salesInvoice: true,
          serviceInvoice: true,
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),

      this.prisma.accountsReceivable.count({ where }),

      this.prisma.accountsReceivable.aggregate({
        where,
        _sum: {
          balanceDue: true,
        },
      }),

      sumByBucket({
        dueDate: {
          gte: asOfStart,
        },
      }),

      sumByBucket({
        dueDate: {
          gte: days30Ago,
          lt: asOfStart,
        },
      }),

      sumByBucket({
        dueDate: {
          gte: days60Ago,
          lt: days30Ago,
        },
      }),

      sumByBucket({
        dueDate: {
          gte: days90Ago,
          lt: days60Ago,
        },
      }),

      sumByBucket({
        dueDate: {
          lt: days90Ago,
        },
      }),

      sumByBucket({
        dueDate: null,
      }),
    ]);

    const items = records.map((record) => {
      let agingBucket:
        'CURRENT' | '1_30' | '31_60' | '61_90' | '91_PLUS' | 'NO_DUE_DATE';

      let overdueDays = 0;

      if (!record.dueDate) {
        agingBucket = 'NO_DUE_DATE';
      } else {
        const dueStart = new Date(
          Date.UTC(
            record.dueDate.getUTCFullYear(),
            record.dueDate.getUTCMonth(),
            record.dueDate.getUTCDate(),
          ),
        );

        overdueDays = Math.max(
          0,
          Math.floor(
            (asOfStart.getTime() - dueStart.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        if (dueStart >= asOfStart) {
          agingBucket = 'CURRENT';
        } else if (overdueDays <= 30) {
          agingBucket = '1_30';
        } else if (overdueDays <= 60) {
          agingBucket = '31_60';
        } else if (overdueDays <= 90) {
          agingBucket = '61_90';
        } else {
          agingBucket = '91_PLUS';
        }
      }

      return {
        ...record,
        agingBucket,
        overdueDays,
      };
    });

    const totalOutstanding = (
      totalAggregate._sum.balanceDue ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      asOfDate,
      totalOutstanding,
      summary: {
        current,
        days1To30,
        days31To60,
        days61To90,
        days91Plus,
        noDueDate,
      },
      count,
      items,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async accountsReceivableCollections(
    query: AccountsReceivableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'The from date must be on or before the to date.',
      );
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const paymentDate =
      query.from || query.to
        ? {
            ...(query.from
              ? {
                  gte: new Date(`${query.from}T00:00:00.000Z`),
                }
              : {}),
            ...(query.to
              ? {
                  lte: new Date(`${query.to}T23:59:59.999Z`),
                }
              : {}),
          }
        : undefined;

    const where: Prisma.CustomerPaymentWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      status: 'POSTED',
      ...(paymentDate ? { paymentDate } : {}),
      OR: [
        {
          salesInvoice: {
            is: {
              paymentMode: 'CREDIT',
            },
          },
        },
        {
          serviceInvoice: {
            is: {
              paymentMode: 'CREDIT',
            },
          },
        },
      ],
    };

    const [payments, count, aggregate] = await Promise.all([
      this.prisma.customerPayment.findMany({
        where,
        include: {
          customer: true,
          branch: true,
          salesInvoice: true,
          serviceInvoice: true,
          account: true,
          cashBankTransaction: true,
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),

      this.prisma.customerPayment.count({
        where,
      }),

      this.prisma.customerPayment.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count,
      total,
      collections: payments,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async accountsPayableSupplierBalances(
    query: AccountsPayableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const payableWhere: Prisma.AccountsPayableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };

    const supplierWhere: Prisma.SupplierWhereInput = {
      ...(query.supplierId ? { id: query.supplierId } : {}),
      accountsPayables: {
        some: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
      },
    };

    const [suppliers, totalSuppliers, payableTotals] = await Promise.all([
      this.prisma.supplier.findMany({
        where: supplierWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),

      this.prisma.supplier.count({
        where: supplierWhere,
      }),

      this.prisma.accountsPayable.aggregate({
        where: payableWhere,
        _count: {
          _all: true,
        },
        _sum: {
          originalAmount: true,
          amountPaid: true,
          balanceDue: true,
        },
      }),
    ]);

    const supplierIds = suppliers.map((supplier) => supplier.id);

    const grouped = supplierIds.length
      ? await this.prisma.accountsPayable.groupBy({
          by: ['supplierId'],
          where: {
            ...payableWhere,
            supplierId: {
              in: supplierIds,
            },
          },
          _count: {
            _all: true,
          },
          _sum: {
            originalAmount: true,
            amountPaid: true,
            balanceDue: true,
          },
        })
      : [];

    const groupedBySupplier = new Map<string, (typeof grouped)[number]>();

    for (const item of grouped) {
      groupedBySupplier.set(item.supplierId, item);
    }

    const toMoney = (value: Prisma.Decimal | null | undefined) =>
      (value ?? new Prisma.Decimal(0)).toDecimalPlaces(2);

    const supplierRows = suppliers.map((supplier) => {
      const aggregate = groupedBySupplier.get(supplier.id);

      return {
        supplier,
        payableCount: aggregate?._count._all ?? 0,
        originalAmount: toMoney(aggregate?._sum.originalAmount),
        amountPaid: toMoney(aggregate?._sum.amountPaid),
        balanceDue: toMoney(aggregate?._sum.balanceDue),
      };
    });

    return {
      count: totalSuppliers,
      suppliers: supplierRows,

      totals: {
        supplierCount: totalSuppliers,
        payableCount: payableTotals._count._all,
        originalAmount: toMoney(payableTotals._sum.originalAmount),
        amountPaid: toMoney(payableTotals._sum.amountPaid),
        balanceDue: toMoney(payableTotals._sum.balanceDue),
      },

      pagination: {
        page,
        limit,
        total: totalSuppliers,
        pages: Math.max(1, Math.ceil(totalSuppliers / limit)),
      },
    };
  }

  async outstandingPayables(
    query: AccountsPayableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AccountsPayableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),

      status: {
        in: ['OPEN', 'PARTIALLY_PAID'],
      },

      balanceDue: {
        gt: 0,
      },
    };

    const [records, count, aggregate] = await Promise.all([
      this.prisma.accountsPayable.findMany({
        where,

        include: {
          supplier: true,
          purchaseInvoice: true,

          payments: {
            where: {
              status: 'POSTED',
            },
            orderBy: {
              paymentDate: 'asc',
            },
          },
        },

        orderBy: [
          {
            dueDate: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],

        skip,
        take: limit,
      }),

      this.prisma.accountsPayable.count({
        where,
      }),

      this.prisma.accountsPayable.aggregate({
        where,

        _sum: {
          balanceDue: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.balanceDue ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      count,
      total,
      records,

      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async dueOverduePayables(
    query: AccountsPayableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const asOfDate = query.asOfDate
      ? new Date(`${query.asOfDate}T23:59:59.999Z`)
      : new Date();

    if (Number.isNaN(asOfDate.getTime())) {
      throw new BadRequestException('Invalid asOfDate.');
    }

    // Compare due dates by calendar day so invoices due today
    // are not prematurely classified as overdue.
    const startOfAsOfDate = new Date(
      Date.UTC(
        asOfDate.getUTCFullYear(),
        asOfDate.getUTCMonth(),
        asOfDate.getUTCDate(),
      ),
    );

    const baseWhere: Prisma.AccountsPayableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),

      status: {
        in: ['OPEN', 'PARTIALLY_PAID'],
      },

      balanceDue: {
        gt: 0,
      },
    };

    const overdueWhere: Prisma.AccountsPayableWhereInput = {
      ...baseWhere,
      dueDate: {
        lt: startOfAsOfDate,
      },
    };

    const dueWhere: Prisma.AccountsPayableWhereInput = {
      ...baseWhere,
      dueDate: {
        gte: startOfAsOfDate,
      },
    };

    const noDueDateWhere: Prisma.AccountsPayableWhereInput = {
      ...baseWhere,
      dueDate: null,
    };

    const loadBucket = async (where: Prisma.AccountsPayableWhereInput) => {
      const [records, count, aggregate] = await Promise.all([
        this.prisma.accountsPayable.findMany({
          where,

          include: {
            supplier: true,
            purchaseInvoice: true,
          },

          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],

          skip,
          take: limit,
        }),

        this.prisma.accountsPayable.count({
          where,
        }),

        this.prisma.accountsPayable.aggregate({
          where,

          _sum: {
            balanceDue: true,
          },
        }),
      ]);

      const total = (
        aggregate._sum.balanceDue ?? new Prisma.Decimal(0)
      ).toDecimalPlaces(2);

      return {
        count,
        total,
        records,

        pagination: {
          page,
          limit,
          total: count,
          pages: Math.max(1, Math.ceil(count / limit)),
        },
      };
    };

    const [overdue, due, noDueDate] = await Promise.all([
      loadBucket(overdueWhere),
      loadBucket(dueWhere),
      loadBucket(noDueDateWhere),
    ]);

    return {
      asOfDate: asOfDate.toISOString(),
      overdue,
      due,
      noDueDate,
    };
  }

  async accountsPayablePaymentHistory(
    query: AccountsPayableReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const fromDate = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : undefined;

    const toDate = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException(
        'The from date must be on or before the to date.',
      );
    }

    const paymentDate =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const where: Prisma.SupplierPaymentWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),

      status: 'POSTED',

      ...(paymentDate ? { paymentDate } : {}),
    };

    const [payments, count, aggregate] = await Promise.all([
      this.prisma.supplierPayment.findMany({
        where,

        include: {
          supplier: true,

          accountsPayable: {
            include: {
              purchaseInvoice: true,
            },
          },

          account: true,
          cashBankTransaction: true,
          paymentVoucher: true,
        },

        // Most recent payments first.
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],

        skip,
        take: limit,
      }),

      this.prisma.supplierPayment.count({
        where,
      }),

      this.prisma.supplierPayment.aggregate({
        where,

        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = (
      aggregate._sum.amount ?? new Prisma.Decimal(0)
    ).toDecimalPlaces(2);

    return {
      from: query.from ?? null,
      to: query.to ?? null,

      count,
      total,
      payments,

      pagination: {
        page,
        limit,
        total: count,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  async dailySales(query: SalesReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);
    if (!query.date) {
      throw new BadRequestException('date is required.');
    }

    const { start, end } = this.getSalesDateRange(query);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        invoiceDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: true,
        createdBy: {
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
        invoiceDate: 'asc',
      },
    });

    const total = invoices.reduce(
      (sum, invoice) => sum.add(invoice.total),
      new Prisma.Decimal(0),
    );

    const amountPaid = invoices.reduce(
      (sum, invoice) => sum.add(invoice.amountPaid),
      new Prisma.Decimal(0),
    );

    const balanceDue = invoices.reduce(
      (sum, invoice) => sum.add(invoice.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      date: query.date,
      count: invoices.length,
      totalSales: total.toDecimalPlaces(2),
      amountPaid: amountPaid.toDecimalPlaces(2),
      balanceDue: balanceDue.toDecimalPlaces(2),
      invoices,
    };
  }

  async monthlySales(query: SalesReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    if (!query.year || !query.month) {
      throw new BadRequestException('year and month are required.');
    }

    const { start, end } = this.getSalesDateRange(query);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        invoiceDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: true,
        createdBy: {
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
        invoiceDate: 'asc',
      },
    });

    const total = invoices.reduce(
      (sum, invoice) => sum.add(invoice.total),
      new Prisma.Decimal(0),
    );

    const amountPaid = invoices.reduce(
      (sum, invoice) => sum.add(invoice.amountPaid),
      new Prisma.Decimal(0),
    );

    const balanceDue = invoices.reduce(
      (sum, invoice) => sum.add(invoice.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      year: query.year,
      month: query.month,
      from: query.from ?? start,
      to: query.to ?? end,
      count: invoices.length,
      totalSales: total.toDecimalPlaces(2),
      amountPaid: amountPaid.toDecimalPlaces(2),
      balanceDue: balanceDue.toDecimalPlaces(2),
      invoices,
    };
  }

  async salesByCustomer(query: SalesReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getSalesDateRange(query);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        invoiceDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        invoiceDate: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        customer: (typeof invoices)[number]['customer'];
        invoiceCount: number;
        totalSales: Prisma.Decimal;
        amountPaid: Prisma.Decimal;
        balanceDue: Prisma.Decimal;
      }
    >();

    for (const invoice of invoices) {
      const existing = grouped.get(invoice.customerId);

      if (!existing) {
        grouped.set(invoice.customerId, {
          customer: invoice.customer,
          invoiceCount: 1,
          totalSales: invoice.total,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
        });

        continue;
      }

      existing.invoiceCount += 1;
      existing.totalSales = existing.totalSales.add(invoice.total);
      existing.amountPaid = existing.amountPaid.add(invoice.amountPaid);
      existing.balanceDue = existing.balanceDue.add(invoice.balanceDue);
    }

    const customers = Array.from(grouped.values()).map((item) => ({
      customer: item.customer,
      invoiceCount: item.invoiceCount,
      totalSales: item.totalSales.toDecimalPlaces(2),
      amountPaid: item.amountPaid.toDecimalPlaces(2),
      balanceDue: item.balanceDue.toDecimalPlaces(2),
    }));

    return {
      from: query.from ?? start,
      to: query.to ?? end,
      count: customers.length,
      customers,
    };
  }

  async salesByProduct(query: SalesReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getSalesDateRange(query);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        invoiceDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: {
          where: {
            ...(query.productId ? { productId: query.productId } : {}),
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        invoiceDate: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        product: (typeof invoices)[number]['items'][number]['product'];
        quantity: number;
        totalSales: Prisma.Decimal;
        invoiceCount: number;
      }
    >();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const existing = grouped.get(item.productId);

        if (!existing) {
          grouped.set(item.productId, {
            product: item.product,
            quantity: item.quantity,
            totalSales: item.subtotal,
            invoiceCount: 1,
          });

          continue;
        }

        existing.quantity += item.quantity;
        existing.totalSales = existing.totalSales.add(item.subtotal);
        existing.invoiceCount += 1;
      }
    }

    const products = Array.from(grouped.values()).map((item) => ({
      product: item.product,
      quantity: item.quantity,
      invoiceCount: item.invoiceCount,
      totalSales: item.totalSales.toDecimalPlaces(2),
    }));

    return {
      from: query.from ?? start,
      to: query.to ?? end,
      count: products.length,
      products,
    };
  }

  async salesBySalesperson(
    query: SalesReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const { start, end } = this.getSalesDateRange(query);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.salespersonId ? { createdById: query.salespersonId } : {}),
        invoiceDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        createdBy: {
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
        invoiceDate: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        salesperson: NonNullable<(typeof invoices)[number]['createdBy']>;
        invoiceCount: number;
        totalSales: Prisma.Decimal;
        amountPaid: Prisma.Decimal;
        balanceDue: Prisma.Decimal;
      }
    >();

    for (const invoice of invoices) {
      if (!invoice.createdBy) {
        continue;
      }

      const existing = grouped.get(invoice.createdBy.id);

      if (!existing) {
        grouped.set(invoice.createdBy.id, {
          salesperson: invoice.createdBy,
          invoiceCount: 1,
          totalSales: invoice.total,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
        });

        continue;
      }

      existing.invoiceCount += 1;
      existing.totalSales = existing.totalSales.add(invoice.total);
      existing.amountPaid = existing.amountPaid.add(invoice.amountPaid);
      existing.balanceDue = existing.balanceDue.add(invoice.balanceDue);
    }

    const salespeople = Array.from(grouped.values()).map((item) => ({
      salesperson: item.salesperson,
      invoiceCount: item.invoiceCount,
      totalSales: item.totalSales.toDecimalPlaces(2),
      amountPaid: item.amountPaid.toDecimalPlaces(2),
      balanceDue: item.balanceDue.toDecimalPlaces(2),
    }));

    return {
      from: query.from ?? start,
      to: query.to ?? end,
      count: salespeople.length,
      salespeople,
    };
  }

  async salesReturns(query: SalesReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const returnDate =
      query.from || query.to
        ? {
            ...(query.from
              ? {
                  gte: new Date(`${query.from}T00:00:00.000Z`),
                }
              : {}),
            ...(query.to
              ? {
                  lte: new Date(`${query.to}T23:59:59.999Z`),
                }
              : {}),
          }
        : undefined;

    const returns = await this.prisma.salesReturn.findMany({
      where: {
        status: 'POSTED',

        ...(query.branchId
          ? {
              branchId: query.branchId,
            }
          : {}),

        ...(query.customerId
          ? {
              customerId: query.customerId,
            }
          : {}),

        ...(query.productId
          ? {
              items: {
                some: {
                  productId: query.productId,
                },
              },
            }
          : {}),

        ...(returnDate
          ? {
              returnDate,
            }
          : {}),
      },

      include: {
        branch: true,
        customer: true,

        salesInvoice: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            paymentMode: true,
            total: true,
          },
        },

        items: {
          include: {
            product: true,
            salesInvoiceItem: true,
          },
        },

        refundAccount: true,

        cashBankTransaction: true,

        createdBy: {
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
        returnDate: 'asc',
      },
    });

    const totalReturns = returns.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    const cashRefund = returns
      .filter((item) => item.settlementMode === 'CASH_REFUND')
      .reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));

    const arAdjustment = returns
      .filter((item) => item.settlementMode === 'AR_ADJUSTMENT')
      .reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));

    const noRefund = returns
      .filter((item) => item.settlementMode === 'NO_REFUND')
      .reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: returns.length,

      totalReturns: totalReturns.toDecimalPlaces(2),

      bySettlementMode: {
        cashRefund: cashRefund.toDecimalPlaces(2),
        arAdjustment: arAdjustment.toDecimalPlaces(2),
        noRefund: noRefund.toDecimalPlaces(2),
      },

      returns,
    };
  }

  private getServiceDateRange(query: ServiceReportQueryDto) {
    const start = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : undefined;

    const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;

    if (
      (start && Number.isNaN(start.getTime())) ||
      (end && Number.isNaN(end.getTime()))
    ) {
      throw new BadRequestException('Invalid service report date range.');
    }

    if (start && end && start > end) {
      throw new BadRequestException('from date cannot be after to date.');
    }

    return {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    };
  }

  async openServiceJobs(query: ServiceReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const createdAt = this.getServiceDateRange(query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.serviceJob.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          customer: true,
          technician: {
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
          parts: {
            include: {
              product: true,
            },
          },
          invoice: true,
        },
        orderBy: [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      }),

      this.prisma.serviceJob.count({
        where,
      }),
    ]);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: total,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async completedRepairs(
    query: ServiceReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const completedAt = this.getServiceDateRange(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      status: 'COMPLETED',
      ...(Object.keys(completedAt).length ? { completedAt } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.serviceJob.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          customer: true,
          technician: {
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
          parts: {
            include: {
              product: true,
            },
          },
          invoice: true,
        },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      }),

      this.prisma.serviceJob.count({ where }),
    ]);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: total,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async pendingRepairs(query: ServiceReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const createdAt = this.getServiceDateRange(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      status: {
        in: [
          'AWAITING_APPROVAL',
          'APPROVED',
          'IN_PROGRESS',
          'READY_FOR_RELEASE',
        ],
      },
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.serviceJob.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          customer: true,
          technician: {
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
          parts: {
            include: {
              product: true,
            },
          },
          invoice: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),

      this.prisma.serviceJob.count({ where }),
    ]);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: total,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async servicePartsUsed(
    query: ServiceReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const createdAt = this.getServiceDateRange(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const serviceJobWhere: Prisma.ServiceJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const where: Prisma.ServiceJobPartWhereInput = {
      issuedQuantity: {
        gt: 0,
      },
      ...(query.productId ? { productId: query.productId } : {}),
      serviceJob: serviceJobWhere,
    };

    const [parts, total, aggregate] = await Promise.all([
      this.prisma.serviceJobPart.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          serviceJob: {
            include: {
              branch: true,
              customer: true,
              technician: {
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
          },
        },
        orderBy: [
          {
            serviceJob: {
              createdAt: 'desc',
            },
          },
          {
            id: 'desc',
          },
        ],
      }),

      this.prisma.serviceJobPart.count({
        where,
      }),

      this.prisma.serviceJobPart.aggregate({
        where,
        _sum: {
          issuedQuantity: true,
          totalCost: true,
        },
      }),
    ]);

    const totalCost = aggregate._sum.totalCost ?? new Prisma.Decimal(0);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: total,
      totalQuantity: aggregate._sum.issuedQuantity ?? 0,
      totalCost: totalCost.toDecimalPlaces(2),
      parts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async serviceRevenue(query: ServiceReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const invoiceDate = this.getServiceDateRange(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceInvoiceWhereInput = {
      status: 'POSTED',
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.technicianId
        ? {
            serviceJob: {
              technicianId: query.technicianId,
            },
          }
        : {}),
      ...(Object.keys(invoiceDate).length ? { invoiceDate } : {}),
    };

    const [
      invoices,
      total,
      invoiceTotals,
      laborTotals,
      partsTotals,
      otherTotals,
    ] = await Promise.all([
      this.prisma.serviceInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          customer: true,
          serviceJob: {
            include: {
              technician: {
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
          },
          items: true,
        },
        orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
      }),

      this.prisma.serviceInvoice.count({ where }),

      this.prisma.serviceInvoice.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),

      this.prisma.serviceInvoiceItem.aggregate({
        where: {
          itemType: 'LABOR',
          serviceInvoice: where,
        },
        _sum: {
          subtotal: true,
        },
      }),

      this.prisma.serviceInvoiceItem.aggregate({
        where: {
          itemType: 'PART',
          serviceInvoice: where,
        },
        _sum: {
          subtotal: true,
        },
      }),

      this.prisma.serviceInvoiceItem.aggregate({
        where: {
          itemType: 'OTHER',
          serviceInvoice: where,
        },
        _sum: {
          subtotal: true,
        },
      }),
    ]);

    const totalRevenue = invoiceTotals._sum.total ?? new Prisma.Decimal(0);

    const laborRevenue = laborTotals._sum.subtotal ?? new Prisma.Decimal(0);

    const partsRevenue = partsTotals._sum.subtotal ?? new Prisma.Decimal(0);

    const otherRevenue = otherTotals._sum.subtotal ?? new Prisma.Decimal(0);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      invoiceCount: total,
      totalRevenue: totalRevenue.toDecimalPlaces(2),
      laborRevenue: laborRevenue.toDecimalPlaces(2),
      partsRevenue: partsRevenue.toDecimalPlaces(2),
      otherRevenue: otherRevenue.toDecimalPlaces(2),
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async technicianPerformance(
    query: ServiceReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const createdAt = this.getServiceDateRange(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const jobWhere: Prisma.ServiceJobWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.technicianId
        ? { technicianId: query.technicianId }
        : { technicianId: { not: null } }),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const technicianWhere: Prisma.UserWhereInput = {
      ...(query.technicianId ? { id: query.technicianId } : {}),
      serviceJobsAsTechnician: {
        some: jobWhere,
      },
    };

    const [pageTechnicians, totalTechnicians, jobGroups, revenueSummary] =
      await Promise.all([
        this.prisma.user.findMany({
          where: technicianWhere,
          skip,
          take: limit,
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        }),

        this.prisma.user.count({
          where: technicianWhere,
        }),

        this.prisma.serviceJob.groupBy({
          by: ['technicianId', 'status'],
          where: jobWhere,
          _count: {
            _all: true,
          },
        }),

        this.prisma.serviceInvoice.aggregate({
          where: {
            status: 'POSTED',
            serviceJob: {
              is: jobWhere,
            },
          },
          _sum: {
            total: true,
          },
        }),
      ]);

    const totalRevenue = revenueSummary._sum.total ?? new Prisma.Decimal(0);

    const overallTotals = jobGroups.reduce(
      (totals, group) => {
        const count = group._count._all;

        totals.totalJobs += count;

        if (group.status === 'COMPLETED') {
          totals.completedJobs += count;
        } else if (group.status === 'CANCELLED') {
          totals.cancelledJobs += count;
        } else {
          totals.activeJobs += count;
        }

        return totals;
      },
      {
        totalJobs: 0,
        completedJobs: 0,
        activeJobs: 0,
        cancelledJobs: 0,
      },
    );

    const technicianIds = pageTechnicians.map((technician) => technician.id);

    const revenueInvoices =
      technicianIds.length > 0
        ? await this.prisma.serviceInvoice.findMany({
            where: {
              status: 'POSTED',
              serviceJob: {
                is: {
                  ...jobWhere,
                  technicianId: {
                    in: technicianIds,
                  },
                },
              },
            },
            select: {
              total: true,
              serviceJob: {
                select: {
                  technicianId: true,
                },
              },
            },
          })
        : [];

    const revenueByTechnician = new Map<string, Prisma.Decimal>();

    for (const invoice of revenueInvoices) {
      const technicianId = invoice.serviceJob.technicianId;

      if (!technicianId) {
        continue;
      }

      const current =
        revenueByTechnician.get(technicianId) ?? new Prisma.Decimal(0);

      revenueByTechnician.set(technicianId, current.add(invoice.total));
    }

    const technicianTotals = new Map<
      string,
      {
        totalJobs: number;
        completedJobs: number;
        activeJobs: number;
        cancelledJobs: number;
      }
    >();

    for (const group of jobGroups) {
      const technicianId = group.technicianId;

      if (!technicianId) {
        continue;
      }

      const current = technicianTotals.get(technicianId) ?? {
        totalJobs: 0,
        completedJobs: 0,
        activeJobs: 0,
        cancelledJobs: 0,
      };

      const count = group._count._all;
      current.totalJobs += count;

      if (group.status === 'COMPLETED') {
        current.completedJobs += count;
      } else if (group.status === 'CANCELLED') {
        current.cancelledJobs += count;
      } else {
        current.activeJobs += count;
      }

      technicianTotals.set(technicianId, current);
    }

    const technicians = pageTechnicians.map((technician) => {
      const stats = technicianTotals.get(technician.id) ?? {
        totalJobs: 0,
        completedJobs: 0,
        activeJobs: 0,
        cancelledJobs: 0,
      };

      const serviceRevenue =
        revenueByTechnician.get(technician.id) ?? new Prisma.Decimal(0);

      return {
        technician,
        ...stats,
        completionRate:
          stats.totalJobs > 0
            ? Number(((stats.completedJobs / stats.totalJobs) * 100).toFixed(2))
            : 0,
        serviceRevenue: serviceRevenue.toDecimalPlaces(2),
      };
    });

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: totalTechnicians,
      totals: {
        totalTechnicians,
        ...overallTotals,
        serviceRevenue: totalRevenue.toDecimalPlaces(2),
        completionRate:
          overallTotals.totalJobs > 0
            ? Number(
                (
                  (overallTotals.completedJobs / overallTotals.totalJobs) *
                  100
                ).toFixed(2),
              )
            : 0,
      },
      technicians,
      pagination: {
        page,
        limit,
        total: totalTechnicians,
        pages: Math.ceil(totalTechnicians / limit),
      },
    };
  }

  async balanceSheet(query: ManagementReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const asOfDate = this.getManagementAsOfDate(query.asOfDate);

    const accounts = await this.prisma.cashBankAccount.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        accountType: {
          in: ['CASH', 'BANK'],
        },
      },
    });

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const aggregate = await this.prisma.cashBankTransaction.aggregate({
          where: {
            accountId: account.id,
            transactionDate: {
              lte: asOfDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const transactions = await this.prisma.cashBankTransaction.findMany({
          where: {
            accountId: account.id,
            transactionDate: {
              lte: asOfDate,
            },
          },
          select: {
            amount: true,
            direction: true,
          },
        });

        const inflow = transactions
          .filter((item) => item.direction === 'IN')
          .reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));

        const outflow = transactions
          .filter((item) => item.direction === 'OUT')
          .reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));

        const currentBalance = account.openingBalance.add(inflow).sub(outflow);

        return {
          id: account.id,
          name: account.name,
          accountType: account.accountType,
          openingBalance: account.openingBalance,
          transactionNet: inflow.sub(outflow),
          balance: currentBalance,
        };
      }),
    );

    const inventory = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      include: {
        product: true,
        branch: true,
      },
    });

    const inventoryValue = inventory.reduce(
      (sum, item) => sum.add(item.averageCost.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const [receivables, payables] = await Promise.all([
      this.prisma.accountsReceivable.findMany({
        where: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
          status: {
            in: ['OPEN', 'PARTIALLY_PAID'],
          },
          balanceDue: {
            gt: 0,
          },
          createdAt: {
            lte: asOfDate,
          },
        },
      }),

      this.prisma.accountsPayable.findMany({
        where: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
          status: {
            in: ['OPEN', 'PARTIALLY_PAID'],
          },
          balanceDue: {
            gt: 0,
          },
          createdAt: {
            lte: asOfDate,
          },
        },
      }),
    ]);

    const cashAndBank = accountBalances.reduce(
      (sum, account) => sum.add(account.balance),
      new Prisma.Decimal(0),
    );

    const accountsReceivable = receivables.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    const accountsPayable = payables.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    const totalAssets = cashAndBank.add(accountsReceivable).add(inventoryValue);

    const totalLiabilities = accountsPayable;

    const derivedEquity = totalAssets.sub(totalLiabilities);

    return {
      asOfDate,

      assets: {
        cashAndBank: cashAndBank.toDecimalPlaces(2),
        accountsReceivable: accountsReceivable.toDecimalPlaces(2),
        inventory: inventoryValue.toDecimalPlaces(2),
        total: totalAssets.toDecimalPlaces(2),
      },

      liabilities: {
        accountsPayable: accountsPayable.toDecimalPlaces(2),
        total: totalLiabilities.toDecimalPlaces(2),
      },

      derivedEquity: derivedEquity.toDecimalPlaces(2),

      accounts: accountBalances,
      inventoryCount: inventory.length,
      receivableCount: receivables.length,
      payableCount: payables.length,
    };
  }

  async cashFlow(query: ManagementReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const dateRange = this.getRequiredManagementPeriod(query);

    const [transactions, pettyCashExpenses] = await Promise.all([
      this.prisma.cashBankTransaction.findMany({
        where: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
          transactionDate: dateRange,
        },
        include: {
          customerPayment: {
            select: {
              salesInvoiceId: true,
              serviceInvoiceId: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'asc',
        },
      }),

      this.prisma.pettyCashVoucher.findMany({
        where: {
          status: 'POSTED',
          ...(query.branchId
            ? {
                fund: {
                  branchId: query.branchId,
                },
              }
            : {}),
          expenseDate: dateRange,
        },
        select: {
          id: true,
          voucherNo: true,
          expenseDate: true,
          description: true,
          amount: true,
          category: true,
        },
        orderBy: {
          expenseDate: 'asc',
        },
      }),
    ]);

    let customerCollections = new Prisma.Decimal(0);

    let otherReceipts = new Prisma.Decimal(0);

    let supplierPayments = new Prisma.Decimal(0);

    let operatingExpenses = new Prisma.Decimal(0);

    let customerRefunds = new Prisma.Decimal(0);

    for (const transaction of transactions) {
      if (transaction.transactionType === 'PETTY_CASH_REPLENISHMENT') {
        continue;
      }

      if (transaction.transactionType === 'CUSTOMER_PAYMENT') {
        customerCollections = customerCollections.add(transaction.amount);
        continue;
      }

      if (transaction.transactionType === 'OTHER_RECEIPT') {
        otherReceipts = otherReceipts.add(transaction.amount);
        continue;
      }

      if (transaction.transactionType === 'SUPPLIER_PAYMENT') {
        supplierPayments = supplierPayments.add(transaction.amount);
        continue;
      }

      if (transaction.transactionType === 'CUSTOMER_REFUND') {
        customerRefunds = customerRefunds.add(transaction.amount);
        continue;
      }

      if (transaction.transactionType === 'EXPENSE') {
        operatingExpenses = operatingExpenses.add(transaction.amount);
      }
    }

    const pettyCashExpenseTotal = pettyCashExpenses.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );

    const totalCashIn = customerCollections.add(otherReceipts);

    const totalCashOut = supplierPayments
      .add(operatingExpenses)
      .add(customerRefunds)
      .add(pettyCashExpenseTotal);

    const netCashFlow = totalCashIn.sub(totalCashOut);

    return {
      from: query.from,
      to: query.to,

      inflows: {
        customerCollections: customerCollections.toDecimalPlaces(2),
        otherReceipts: otherReceipts.toDecimalPlaces(2),
        total: totalCashIn.toDecimalPlaces(2),
      },

      outflows: {
        supplierPayments: supplierPayments.toDecimalPlaces(2),
        operatingExpenses: operatingExpenses.toDecimalPlaces(2),
        customerRefunds: customerRefunds.toDecimalPlaces(2),
        pettyCashExpenses: pettyCashExpenseTotal.toDecimalPlaces(2),
        total: totalCashOut.toDecimalPlaces(2),
      },

      netCashFlow: netCashFlow.toDecimalPlaces(2),

      transactionCount: transactions.length,

      pettyCashExpenseCount: pettyCashExpenses.length,
    };
  }

  async salesProfitability(
    query: ManagementReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const statement = await this.incomeStatement(query, user);

    return {
      from: statement.from,
      to: statement.to,

      revenue: statement.revenue,

      costOfSales: statement.costOfSales,

      grossProfit: statement.grossProfit,

      grossMargin: statement.grossMargin,

      operatingExpenses: statement.operatingExpenses,

      estimatedNetProfit: statement.estimatedNetIncome,
    };
  }

  async inventoryValuation(
    query: ManagementReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const requestedPage = Math.max(1, Math.trunc(Number(query.page) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.trunc(Number(query.limit) || 10)),
    );

    const where = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    // Count all matching rows and fetch only the two fields needed to calculate
    // cross-page quantity/value totals. Full product/branch records are fetched
    // only for the requested page below.
    const [count, valuationTotals] = await Promise.all([
      this.prisma.inventoryBalance.count({ where }),
      this.prisma.inventoryBalance.findMany({
        where,
        select: {
          quantity: true,
          averageCost: true,
        },
      }),
    ]);

    const pages = Math.max(1, Math.ceil(count / limit));
    const page = Math.min(requestedPage, pages);
    const skip = (page - 1) * limit;

    const balances = await this.prisma.inventoryBalance.findMany({
      where,
      include: {
        branch: true,
        product: true,
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      skip,
      take: limit,
    });

    const items = balances.map((balance) => ({
      branchId: balance.branchId,
      branchName: balance.branch.name,
      productId: balance.productId,
      sku: balance.product.sku,
      productName: balance.product.name,
      quantity: balance.quantity,
      averageCost: balance.averageCost.toDecimalPlaces(2),
      inventoryValue: balance.averageCost
        .mul(balance.quantity)
        .toDecimalPlaces(2),
    }));

    const totalQuantity = valuationTotals.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const totalValue = valuationTotals.reduce(
      (sum, item) => sum.add(item.averageCost.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      asOfDate: query.asOfDate ?? new Date().toISOString(),
      count,
      totalQuantity,
      totalValue: totalValue.toDecimalPlaces(2),
      items,
      pagination: {
        page,
        limit,
        total: count,
        pages,
      },
    };
  }

  async arApAging(query: ManagementReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const asOfDate = this.getManagementAsOfDate(query.asOfDate);
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoff31 = new Date(asOfDate.getTime() - 31 * dayMs);
    const cutoff61 = new Date(asOfDate.getTime() - 61 * dayMs);
    const cutoff91 = new Date(asOfDate.getTime() - 91 * dayMs);

    const requestedArPage = Math.max(1, Math.trunc(Number(query.arPage) || 1));
    const requestedApPage = Math.max(1, Math.trunc(Number(query.apPage) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.trunc(Number(query.limit) || 10)),
    );

    const arWhere: Prisma.AccountsReceivableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      status: { in: ['OPEN', 'PARTIALLY_PAID'] },
      balanceDue: { gt: 0 },
    };

    const apWhere: Prisma.AccountsPayableWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      status: { in: ['OPEN', 'PARTIALLY_PAID'] },
      balanceDue: { gt: 0 },
    };

    const [arBucketResults, apBucketResults] = await Promise.all([
      Promise.all([
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: { gte: asOfDate } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: { gt: cutoff31, lt: asOfDate } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: { gt: cutoff61, lte: cutoff31 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: { gt: cutoff91, lte: cutoff61 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: { lte: cutoff91 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsReceivable.aggregate({
          where: { ...arWhere, dueDate: null },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
      ]),
      Promise.all([
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: { gte: asOfDate } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: { gt: cutoff31, lt: asOfDate } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: { gt: cutoff61, lte: cutoff31 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: { gt: cutoff91, lte: cutoff61 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: { lte: cutoff91 } },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.accountsPayable.aggregate({
          where: { ...apWhere, dueDate: null },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
      ]),
    ]);

    const zero = () => new Prisma.Decimal(0);
    const bucketTotal = (rows: typeof arBucketResults) =>
      rows.reduce((sum, row) => sum.add(row._sum.balanceDue ?? zero()), zero());
    const bucketCount = (rows: typeof arBucketResults) =>
      rows.reduce((sum, row) => sum + row._count._all, 0);
    const serializeBuckets = (rows: typeof arBucketResults) => ({
      current: (rows[0]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
      '1_30': (rows[1]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
      '31_60': (rows[2]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
      '61_90': (rows[3]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
      '91_plus': (rows[4]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
      noDueDate: (rows[5]._sum.balanceDue ?? zero()).toDecimalPlaces(2),
    });

    const arCount = bucketCount(arBucketResults);
    const apCount = bucketCount(apBucketResults);
    const arTotal = bucketTotal(arBucketResults);
    const apTotal = bucketTotal(apBucketResults);
    const arPages = Math.max(1, Math.ceil(arCount / limit));
    const apPages = Math.max(1, Math.ceil(apCount / limit));
    const arPage = Math.min(requestedArPage, arPages);
    const apPage = Math.min(requestedApPage, apPages);

    const [receivables, payables] = await Promise.all([
      this.prisma.accountsReceivable.findMany({
        where: arWhere,
        include: { customer: true },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        skip: (arPage - 1) * limit,
        take: limit,
      }),
      this.prisma.accountsPayable.findMany({
        where: apWhere,
        include: { supplier: true },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        skip: (apPage - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      asOfDate,
      accountsReceivable: {
        count: arCount,
        total: arTotal.toDecimalPlaces(2),
        aging: serializeBuckets(arBucketResults),
        records: receivables,
        pagination: {
          page: arPage,
          limit,
          total: arCount,
          pages: arPages,
        },
      },
      accountsPayable: {
        count: apCount,
        total: apTotal.toDecimalPlaces(2),
        aging: serializeBuckets(apBucketResults),
        records: payables,
        pagination: {
          page: apPage,
          limit,
          total: apCount,
          pages: apPages,
        },
      },
    };
  }

  async purchaseOrderReport(
    query: PurchasingReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const orderDate = this.getOptionalDateRange(query.from, query.to);

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(orderDate ? { orderDate } : {}),
      },

      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        orderDate: 'asc',
      },
    });

    const total = purchaseOrders.reduce(
      (sum, order) => sum.add(order.total),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: purchaseOrders.length,
      total: total.toDecimalPlaces(2),
      purchaseOrders,
    };
  }

  async purchasesBySupplier(
    query: PurchasingReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const invoiceDate = this.getOptionalDateRange(query.from, query.to);

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: 'POSTED',

        ...(invoiceDate ? { invoiceDate } : {}),
      },

      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        invoiceDate: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        supplier: (typeof invoices)[number]['supplier'];
        invoiceCount: number;
        subtotal: Prisma.Decimal;
        total: Prisma.Decimal;
      }
    >();

    for (const invoice of invoices) {
      const existing = grouped.get(invoice.supplierId);

      if (!existing) {
        grouped.set(invoice.supplierId, {
          supplier: invoice.supplier,
          invoiceCount: 1,
          subtotal: invoice.subtotal,
          total: invoice.total,
        });

        continue;
      }

      existing.invoiceCount += 1;
      existing.subtotal = existing.subtotal.add(invoice.subtotal);
      existing.total = existing.total.add(invoice.total);
    }

    const suppliers = Array.from(grouped.values()).map((item) => ({
      supplier: item.supplier,
      invoiceCount: item.invoiceCount,
      subtotal: item.subtotal.toDecimalPlaces(2),
      total: item.total.toDecimalPlaces(2),
    }));

    const grandTotal = suppliers.reduce(
      (sum, supplier) => sum.add(supplier.total),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: suppliers.length,
      grandTotal: grandTotal.toDecimalPlaces(2),
      suppliers,
    };
  }

  async purchasesByDate(
    query: PurchasingReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const invoiceDate = this.getOptionalDateRange(query.from, query.to);

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: 'POSTED',

        ...(invoiceDate ? { invoiceDate } : {}),
      },

      include: {
        supplier: true,
        branch: true,
      },

      orderBy: {
        invoiceDate: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        date: string;
        invoiceCount: number;
        total: Prisma.Decimal;
      }
    >();

    for (const invoice of invoices) {
      const date = invoice.invoiceDate.toISOString().slice(0, 10);

      const existing = grouped.get(date);

      if (!existing) {
        grouped.set(date, {
          date,
          invoiceCount: 1,
          total: invoice.total,
        });

        continue;
      }

      existing.invoiceCount += 1;
      existing.total = existing.total.add(invoice.total);
    }

    const dates = Array.from(grouped.values()).map((item) => ({
      ...item,
      total: item.total.toDecimalPlaces(2),
    }));

    const grandTotal = dates.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: dates.length,
      grandTotal: grandTotal.toDecimalPlaces(2),
      dates,
    };
  }

  async outstandingPurchaseOrders(
    query: PurchasingReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const orderDate = this.getOptionalDateRange(query.from, query.to);

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: {
          in: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'],
        },

        ...(orderDate ? { orderDate } : {}),
      },

      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        orderDate: 'asc',
      },
    });

    const records = purchaseOrders
      .map((order) => {
        const items = order.items
          .map((item) => {
            const remainingQuantity = item.quantity - item.receivedQuantity;

            return {
              ...item,
              remainingQuantity,
            };
          })
          .filter((item) => item.remainingQuantity > 0);

        return {
          ...order,
          items,
        };
      })
      .filter((order) => order.items.length > 0);

    const outstandingTotal = records.reduce((sum, order) => {
      const orderOutstanding = order.items.reduce(
        (itemSum, item) =>
          itemSum.add(item.unitCost.mul(item.remainingQuantity)),
        new Prisma.Decimal(0),
      );

      return sum.add(orderOutstanding);
    }, new Prisma.Decimal(0));

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: records.length,
      outstandingTotal: outstandingTotal.toDecimalPlaces(2),
      purchaseOrders: records,
    };
  }

  async inventoryStock(
    query: InventoryReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryBalanceWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };

    const search = query.search?.trim();

    if (search) {
      where.OR = [
        {
          product: {
            sku: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          product: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          product: {
            category: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const sortOrder = query.sortOrder ?? 'asc';

    const orderBy =
      query.sortBy === 'sku'
        ? { product: { sku: sortOrder } }
        : query.sortBy === 'quantity'
          ? { quantity: sortOrder }
          : query.sortBy === 'averageCost'
            ? { averageCost: sortOrder }
            : query.sortBy === 'updatedAt'
              ? { updatedAt: sortOrder }
              : { product: { name: sortOrder } };

    const [balances, total, summaryBalances] = await this.prisma.$transaction([
      this.prisma.inventoryBalance.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy,
      }),

      this.prisma.inventoryBalance.count({
        where,
      }),

      this.prisma.inventoryBalance.findMany({
        where,
        select: {
          quantity: true,
          averageCost: true,
        },
      }),
    ]);

    const totalQuantity = summaryBalances.reduce(
      (sum, balance) => sum + balance.quantity,
      0,
    );

    const totalValue = summaryBalances.reduce(
      (sum, balance) => sum.add(balance.averageCost.mul(balance.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      // Backward-compatible fields for existing consumers
      count: total,
      totalQuantity,
      totalValue: totalValue.toDecimalPlaces(2),

      items: balances.map((balance) => ({
        branchId: balance.branchId,
        branchCode: balance.branch.code,
        branchName: balance.branch.name,

        productId: balance.productId,

        sku: balance.product.sku,
        productName: balance.product.name,
        category: balance.product.category?.name ?? null,
        unit: balance.product.unit,

        quantity: balance.quantity,
        averageCost: balance.averageCost,
        inventoryValue: balance.averageCost
          .mul(balance.quantity)
          .toDecimalPlaces(2),

        updatedAt: balance.updatedAt,
      })),

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async stockCard(query: InventoryReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const createdAt = this.getOptionalDateRange(query.from, query.to);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },

      include: {
        branch: true,
        product: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const totalIn = movements
      .filter((movement) => movement.quantityChange > 0)
      .reduce((sum, movement) => sum + movement.quantityChange, 0);

    const totalOut = movements
      .filter((movement) => movement.quantityChange < 0)
      .reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      productId: query.productId ?? null,
      count: movements.length,
      totalIn,
      totalOut,
      netQuantityChange: totalIn - totalOut,
      movements: movements.map((movement) => ({
        id: movement.id,
        date: movement.createdAt,
        productId: movement.productId,
        sku: movement.product.sku,
        productName: movement.product.name,
        type: movement.type,
        quantityChange: movement.quantityChange,
        balanceAfter: movement.balanceAfter,
        unitCost: movement.unitCost,
        totalCost: movement.totalCost,
        averageCostAfter: movement.averageCostAfter,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        notes: movement.notes,
      })),
    };
  }

  async inventoryValuationReport(
    query: InventoryReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);

    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
      },

      include: {
        product: true,
        branch: true,
      },

      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });

    const items = balances.map((balance) => ({
      branchId: balance.branchId,
      productId: balance.productId,
      sku: balance.product.sku,
      productName: balance.product.name,
      quantity: balance.quantity,
      averageCost: balance.averageCost,
      inventoryValue: balance.averageCost
        .mul(balance.quantity)
        .toDecimalPlaces(2),
    }));

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const totalValue = items.reduce(
      (sum, item) => sum.add(item.inventoryValue),
      new Prisma.Decimal(0),
    );

    return {
      count: items.length,
      totalQuantity,
      totalValue: totalValue.toDecimalPlaces(2),
      items,
    };
  }

  async lowStock(query: InventoryReportQueryDto, user: AuthenticatedUser) {
    query = this.scopeReportQuery(query, user);

    const threshold = query.threshold ?? 5;

    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),

        quantity: {
          lte: threshold,
        },
      },

      include: {
        product: {
          include: {
            category: true,
          },
        },
        branch: true,
      },

      orderBy: {
        quantity: 'asc',
      },
    });

    return {
      threshold,
      count: balances.length,
      items: balances.map((balance) => ({
        branchId: balance.branchId,
        productId: balance.productId,
        sku: balance.product.sku,
        productName: balance.product.name,
        category: balance.product.category?.name ?? null,
        quantity: balance.quantity,
        averageCost: balance.averageCost,
        inventoryValue: balance.averageCost
          .mul(balance.quantity)
          .toDecimalPlaces(2),
      })),
    };
  }

  async inventoryMovement(
    query: InventoryReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);
    const createdAt = this.getOptionalDateRange(query.from, query.to);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(createdAt ? { createdAt } : {}),
      },

      include: {
        branch: true,
        product: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const totalIn = movements
      .filter((movement) => movement.quantityChange > 0)
      .reduce((sum, movement) => sum + movement.quantityChange, 0);

    const totalOut = movements
      .filter((movement) => movement.quantityChange < 0)
      .reduce((sum, movement) => sum + Math.abs(movement.quantityChange), 0);

    const totalCost = movements.reduce(
      (sum, movement) => sum.add(movement.totalCost ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: movements.length,
      totalIn,
      totalOut,
      netQuantityChange: totalIn - totalOut,
      totalCost: totalCost.toDecimalPlaces(2),
      movements,
    };
  }

  async physicalCountAdjustments(
    query: InventoryReportQueryDto,
    user: AuthenticatedUser,
  ) {
    query = this.scopeReportQuery(query, user);
    const adjustmentDate = this.getOptionalDateRange(query.from, query.to);

    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.status ? { status: query.status } : {}),

        ...(adjustmentDate ? { adjustmentDate } : {}),
      },

      include: {
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        adjustmentDate: 'asc',
      },
    });

    const postedAdjustments = adjustments.filter(
      (adjustment) => adjustment.status === 'POSTED',
    );

    const totalAdjustments = postedAdjustments.length;

    const totalIncrease = postedAdjustments.reduce(
      (sum, adjustment) =>
        sum +
        adjustment.items.reduce(
          (itemSum, item) => itemSum + Math.max(item.difference, 0),
          0,
        ),
      0,
    );

    const totalDecrease = postedAdjustments.reduce(
      (sum, adjustment) =>
        sum +
        adjustment.items.reduce(
          (itemSum, item) => itemSum + Math.abs(Math.min(item.difference, 0)),
          0,
        ),
      0,
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: totalAdjustments,
      totalIncrease,
      totalDecrease,
      adjustments: postedAdjustments,
    };
  }
}
