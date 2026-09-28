import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@computer-sales/database';
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

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async incomeStatement(query: ManagementReportQueryDto) {
    const dateRange = this.getRequiredManagementPeriod(query);

    const [
      salesAggregate,
      returnsAggregate,
      serviceAggregate,
      saleCogsAggregate,
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

    const salesCogs = saleCogsAggregate._sum.totalCost ?? new Prisma.Decimal(0);

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

  async dailyCashReport(query: CashBankReportQueryDto) {
    const { start, end } = this.getDayRange(query.date);

    const accounts = await this.prisma.cashBankAccount.findMany({
      where: {
        accountType: 'CASH',
        isActive: true,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.accountId ? { id: query.accountId } : {}),
      },
      select: {
        id: true,
        branchId: true,
        name: true,
        accountNumber: true,
        openingBalance: true,
      },
    });

    let openingBalance = new Prisma.Decimal(0);
    let cashReceipts = new Prisma.Decimal(0);
    let cashDisbursements = new Prisma.Decimal(0);

    for (const account of accounts) {
      const [before, inToday, outToday] = await Promise.all([
        this.prisma.cashBankTransaction.findMany({
          where: {
            accountId: account.id,
            transactionDate: {
              lt: start,
            },
          },
          select: {
            direction: true,
            amount: true,
          },
        }),

        this.prisma.cashBankTransaction.aggregate({
          where: {
            accountId: account.id,
            transactionDate: {
              gte: start,
              lte: end,
            },
            direction: 'IN',
          },
          _sum: {
            amount: true,
          },
        }),

        this.prisma.cashBankTransaction.aggregate({
          where: {
            accountId: account.id,
            transactionDate: {
              gte: start,
              lte: end,
            },
            direction: 'OUT',
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      let accountOpening = account.openingBalance;

      for (const transaction of before) {
        if (transaction.direction === 'IN') {
          accountOpening = accountOpening.add(transaction.amount);
        } else {
          accountOpening = accountOpening.sub(transaction.amount);
        }
      }

      openingBalance = openingBalance.add(accountOpening);

      cashReceipts = cashReceipts.add(
        inToday._sum.amount ?? new Prisma.Decimal(0),
      );

      cashDisbursements = cashDisbursements.add(
        outToday._sum.amount ?? new Prisma.Decimal(0),
      );
    }

    const closingBalance = openingBalance
      .add(cashReceipts)
      .sub(cashDisbursements)
      .toDecimalPlaces(2);

    return {
      date: query.date,
      openingBalance: openingBalance.toDecimalPlaces(2),
      cashReceipts: cashReceipts.toDecimalPlaces(2),
      cashDisbursements: cashDisbursements.toDecimalPlaces(2),
      closingBalance,
      accounts,
    };
  }

  async cashReceipts(query: CashBankReportQueryDto) {
    const { start, end } = this.getDateRange(query);

    const transactions = await this.prisma.cashBankTransaction.findMany({
      where: this.buildTransactionWhere(query, start, end, 'IN', 'CASH'),
      include: {
        account: true,
        branch: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    const total = transactions.reduce(
      (sum, transaction) => sum.add(transaction.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from,
      to: query.to,
      count: transactions.length,
      total: total.toDecimalPlaces(2),
      transactions,
    };
  }

  async cashDisbursements(query: CashBankReportQueryDto) {
    const { start, end } = this.getDateRange(query);

    const transactions = await this.prisma.cashBankTransaction.findMany({
      where: this.buildTransactionWhere(query, start, end, 'OUT', 'CASH'),
      include: {
        account: true,
        branch: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    const total = transactions.reduce(
      (sum, transaction) => sum.add(transaction.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from,
      to: query.to,
      count: transactions.length,
      total: total.toDecimalPlaces(2),
      transactions,
    };
  }

  async bankTransactions(query: CashBankReportQueryDto) {
    const { start, end } = this.getDateRange(query);

    const transactions = await this.prisma.cashBankTransaction.findMany({
      where: this.buildTransactionWhere(query, start, end, undefined, 'BANK'),
      include: {
        account: true,
        branch: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    const totalIn = transactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce(
        (sum, transaction) => sum.add(transaction.amount),
        new Prisma.Decimal(0),
      );

    const totalOut = transactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce(
        (sum, transaction) => sum.add(transaction.amount),
        new Prisma.Decimal(0),
      );

    return {
      from: query.from,
      to: query.to,
      count: transactions.length,
      totalIn: totalIn.toDecimalPlaces(2),
      totalOut: totalOut.toDecimalPlaces(2),
      net: totalIn.sub(totalOut).toDecimalPlaces(2),
      transactions,
    };
  }

  async bankReconciliation(query: CashBankReportQueryDto) {
    const where: Prisma.BankReconciliationWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
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

    return this.prisma.bankReconciliation.findMany({
      where,
      include: {
        account: true,
        branch: true,
        items: {
          include: {
            cashBankTransaction: true,
          },
        },
      },
      orderBy: {
        statementDate: 'desc',
      },
    });
  }

  async pettyCashVouchers(query: PettyCashReportQueryDto) {
    const expenseDate = this.getOptionalDateRange(query.from, query.to);

    const vouchers = await this.prisma.pettyCashVoucher.findMany({
      where: {
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
      },

      include: {
        fund: true,
      },

      orderBy: {
        expenseDate: 'asc',
      },
    });

    const total = vouchers.reduce(
      (sum, voucher) => sum.add(voucher.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: vouchers.length,
      total: total.toDecimalPlaces(2),
      vouchers,
    };
  }

  async pettyCashReplenishments(query: PettyCashReportQueryDto) {
    const replenishmentDate = this.getOptionalDateRange(query.from, query.to);

    const replenishments = await this.prisma.pettyCashReplenishment.findMany({
      where: {
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
      },

      include: {
        fund: true,
        account: true,
        cashBankTransaction: true,
      },

      orderBy: {
        replenishmentDate: 'asc',
      },
    });

    const total = replenishments.reduce(
      (sum, replenishment) => sum.add(replenishment.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: replenishments.length,
      total: total.toDecimalPlaces(2),
      replenishments,
    };
  }

  async pettyCashTransactions(query: PettyCashReportQueryDto) {
    const expenseDate = this.getOptionalDateRange(query.from, query.to);

    const replenishmentDate = this.getOptionalDateRange(query.from, query.to);

    const [vouchers, replenishments] = await Promise.all([
      this.prisma.pettyCashVoucher.findMany({
        where: {
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
        },

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
        },
      }),

      this.prisma.pettyCashReplenishment.findMany({
        where: {
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
        },

        select: {
          id: true,
          replenishmentNo: true,
          fundId: true,
          replenishmentDate: true,
          amount: true,
          referenceNo: true,
          notes: true,
        },
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
        sourceReferenceNo: replenishment.referenceNo,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalIn = transactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce(
        (sum, transaction) => sum.add(transaction.amount),
        new Prisma.Decimal(0),
      );

    const totalOut = transactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce(
        (sum, transaction) => sum.add(transaction.amount),
        new Prisma.Decimal(0),
      );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: transactions.length,
      totalIn: totalIn.toDecimalPlaces(2),
      totalOut: totalOut.toDecimalPlaces(2),
      net: totalIn.sub(totalOut).toDecimalPlaces(2),
      transactions,
    };
  }

  async pettyCashBalance(query: PettyCashReportQueryDto) {
    const funds = await this.prisma.pettyCashFund.findMany({
      where: {
        ...(query.fundId ? { id: query.fundId } : {}),

        ...(query.branchId ? { branchId: query.branchId } : {}),
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

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

        const totalExpenses = vouchers._sum.amount ?? new Prisma.Decimal(0);

        const totalReplenishments =
          replenishments._sum.amount ?? new Prisma.Decimal(0);

        return {
          fundId: fund.id,
          fundNo: fund.fundNo,
          name: fund.name,
          branchId: fund.branchId,
          openingBalance: fund.openingBalance,
          currentBalance: fund.currentBalance,
          totalExpenses: totalExpenses.toDecimalPlaces(2),
          totalReplenishments: totalReplenishments.toDecimalPlaces(2),
        };
      }),
    );

    return {
      count: balances.length,
      funds: balances,
    };
  }

  async accountsReceivableCustomerBalances(
    query: AccountsReceivableReportQueryDto,
  ) {
    const records = await this.prisma.accountsReceivable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.customerId ? { customerId: query.customerId } : {}),
      },

      include: {
        customer: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        customer: (typeof records)[number]['customer'];
        originalAmount: Prisma.Decimal;
        amountPaid: Prisma.Decimal;
        balanceDue: Prisma.Decimal;
        invoiceCount: number;
      }
    >();

    for (const record of records) {
      const existing = grouped.get(record.customerId);

      if (!existing) {
        grouped.set(record.customerId, {
          customer: record.customer,
          originalAmount: record.originalAmount,
          amountPaid: record.amountPaid,
          balanceDue: record.balanceDue,
          invoiceCount: 1,
        });
        continue;
      }

      existing.originalAmount = existing.originalAmount.add(
        record.originalAmount,
      );

      existing.amountPaid = existing.amountPaid.add(record.amountPaid);

      existing.balanceDue = existing.balanceDue.add(record.balanceDue);

      existing.invoiceCount += 1;
    }

    const customers = Array.from(grouped.values()).map((item) => ({
      customer: item.customer,
      invoiceCount: item.invoiceCount,
      originalAmount: item.originalAmount.toDecimalPlaces(2),
      amountPaid: item.amountPaid.toDecimalPlaces(2),
      balanceDue: item.balanceDue.toDecimalPlaces(2),
    }));

    return {
      count: customers.length,
      customers,
    };
  }

  async outstandingReceivables(query: AccountsReceivableReportQueryDto) {
    const records = await this.prisma.accountsReceivable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.customerId ? { customerId: query.customerId } : {}),

        status: {
          in: ['OPEN', 'PARTIALLY_PAID'],
        },

        balanceDue: {
          gt: 0,
        },
      },

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
    });

    const total = records.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      count: records.length,
      total: total.toDecimalPlaces(2),
      records,
    };
  }

  async agingOfReceivables(query: AccountsReceivableReportQueryDto) {
    const asOfDate = query.asOfDate
      ? new Date(`${query.asOfDate}T23:59:59.999Z`)
      : new Date();

    if (Number.isNaN(asOfDate.getTime())) {
      throw new BadRequestException('Invalid asOfDate.');
    }

    const records = await this.prisma.accountsReceivable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.customerId ? { customerId: query.customerId } : {}),

        status: {
          in: ['OPEN', 'PARTIALLY_PAID'],
        },

        balanceDue: {
          gt: 0,
        },
      },

      include: {
        customer: true,
        salesInvoice: true,
        serviceInvoice: true,
      },

      orderBy: {
        dueDate: 'asc',
      },
    });

    const buckets = {
      current: new Prisma.Decimal(0),
      days1To30: new Prisma.Decimal(0),
      days31To60: new Prisma.Decimal(0),
      days61To90: new Prisma.Decimal(0),
      days91Plus: new Prisma.Decimal(0),
      noDueDate: new Prisma.Decimal(0),
    };

    const items = records.map((record) => {
      let bucket:
        'CURRENT' | '1_30' | '31_60' | '61_90' | '91_PLUS' | 'NO_DUE_DATE';

      let overdueDays = 0;

      if (!record.dueDate) {
        bucket = 'NO_DUE_DATE';
        buckets.noDueDate = buckets.noDueDate.add(record.balanceDue);
      } else if (record.dueDate >= asOfDate) {
        bucket = 'CURRENT';
        buckets.current = buckets.current.add(record.balanceDue);
      } else {
        overdueDays = Math.floor(
          (asOfDate.getTime() - record.dueDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (overdueDays <= 30) {
          bucket = '1_30';
          buckets.days1To30 = buckets.days1To30.add(record.balanceDue);
        } else if (overdueDays <= 60) {
          bucket = '31_60';
          buckets.days31To60 = buckets.days31To60.add(record.balanceDue);
        } else if (overdueDays <= 90) {
          bucket = '61_90';
          buckets.days61To90 = buckets.days61To90.add(record.balanceDue);
        } else {
          bucket = '91_PLUS';
          buckets.days91Plus = buckets.days91Plus.add(record.balanceDue);
        }
      }

      return {
        ...record,
        agingBucket: bucket,
        overdueDays,
      };
    });

    const totalOutstanding = records.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      asOfDate,
      totalOutstanding: totalOutstanding.toDecimalPlaces(2),

      summary: {
        current: buckets.current.toDecimalPlaces(2),
        days1To30: buckets.days1To30.toDecimalPlaces(2),
        days31To60: buckets.days31To60.toDecimalPlaces(2),
        days61To90: buckets.days61To90.toDecimalPlaces(2),
        days91Plus: buckets.days91Plus.toDecimalPlaces(2),
        noDueDate: buckets.noDueDate.toDecimalPlaces(2),
      },

      count: items.length,
      items,
    };
  }

  async accountsReceivableCollections(query: AccountsReceivableReportQueryDto) {
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

    const payments = await this.prisma.customerPayment.findMany({
      where: {
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
      },

      include: {
        customer: true,
        salesInvoice: true,
        serviceInvoice: true,
        account: true,
        cashBankTransaction: true,
      },

      orderBy: {
        paymentDate: 'asc',
      },
    });

    const total = payments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: payments.length,
      total: total.toDecimalPlaces(2),
      collections: payments,
    };
  }

  async accountsPayableSupplierBalances(query: AccountsPayableReportQueryDto) {
    const records = await this.prisma.accountsPayable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },

      include: {
        supplier: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const grouped = new Map<
      string,
      {
        supplier: (typeof records)[number]['supplier'];
        payableCount: number;
        originalAmount: Prisma.Decimal;
        amountPaid: Prisma.Decimal;
        balanceDue: Prisma.Decimal;
      }
    >();

    for (const record of records) {
      const existing = grouped.get(record.supplierId);

      if (!existing) {
        grouped.set(record.supplierId, {
          supplier: record.supplier,
          payableCount: 1,
          originalAmount: record.originalAmount,
          amountPaid: record.amountPaid,
          balanceDue: record.balanceDue,
        });

        continue;
      }

      existing.payableCount += 1;
      existing.originalAmount = existing.originalAmount.add(
        record.originalAmount,
      );
      existing.amountPaid = existing.amountPaid.add(record.amountPaid);
      existing.balanceDue = existing.balanceDue.add(record.balanceDue);
    }

    const suppliers = Array.from(grouped.values()).map((item) => ({
      supplier: item.supplier,
      payableCount: item.payableCount,
      originalAmount: item.originalAmount.toDecimalPlaces(2),
      amountPaid: item.amountPaid.toDecimalPlaces(2),
      balanceDue: item.balanceDue.toDecimalPlaces(2),
    }));

    return {
      count: suppliers.length,
      suppliers,
    };
  }

  async outstandingPayables(query: AccountsPayableReportQueryDto) {
    const records = await this.prisma.accountsPayable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: {
          in: ['OPEN', 'PARTIALLY_PAID'],
        },

        balanceDue: {
          gt: 0,
        },
      },

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
    });

    const total = records.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      count: records.length,
      total: total.toDecimalPlaces(2),
      records,
    };
  }

  async dueOverduePayables(query: AccountsPayableReportQueryDto) {
    const asOfDate = query.asOfDate
      ? new Date(`${query.asOfDate}T23:59:59.999Z`)
      : new Date();

    if (Number.isNaN(asOfDate.getTime())) {
      throw new BadRequestException('Invalid asOfDate.');
    }

    const records = await this.prisma.accountsPayable.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: {
          in: ['OPEN', 'PARTIALLY_PAID'],
        },

        balanceDue: {
          gt: 0,
        },
      },

      include: {
        supplier: true,
        purchaseInvoice: true,
      },

      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    const due: typeof records = [];
    const overdue: typeof records = [];
    const noDueDate: typeof records = [];

    for (const record of records) {
      if (!record.dueDate) {
        noDueDate.push(record);
        continue;
      }

      if (record.dueDate < asOfDate) {
        overdue.push(record);
      } else {
        due.push(record);
      }
    }

    const dueTotal = due.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    const overdueTotal = overdue.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    const noDueDateTotal = noDueDate.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      asOfDate,

      due: {
        count: due.length,
        total: dueTotal.toDecimalPlaces(2),
        records: due,
      },

      overdue: {
        count: overdue.length,
        total: overdueTotal.toDecimalPlaces(2),
        records: overdue,
      },

      noDueDate: {
        count: noDueDate.length,
        total: noDueDateTotal.toDecimalPlaces(2),
        records: noDueDate,
      },
    };
  }

  async accountsPayablePaymentHistory(query: AccountsPayableReportQueryDto) {
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

    const payments = await this.prisma.supplierPayment.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),

        ...(query.supplierId ? { supplierId: query.supplierId } : {}),

        status: 'POSTED',

        ...(paymentDate ? { paymentDate } : {}),
      },

      include: {
        supplier: true,
        accountsPayable: true,
        account: true,
        cashBankTransaction: true,
        paymentVoucher: true,
      },

      orderBy: {
        paymentDate: 'asc',
      },
    });

    const total = payments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0),
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: payments.length,
      total: total.toDecimalPlaces(2),
      payments,
    };
  }

  async dailySales(query: SalesReportQueryDto) {
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

  async monthlySales(query: SalesReportQueryDto) {
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

  async salesByCustomer(query: SalesReportQueryDto) {
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

  async salesByProduct(query: SalesReportQueryDto) {
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

  async salesBySalesperson(query: SalesReportQueryDto) {
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

  async salesReturns(query: SalesReportQueryDto) {
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

  async openServiceJobs(query: ServiceReportQueryDto) {
    const createdAt = this.getServiceDateRange(query);

    const jobs = await this.prisma.serviceJob.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.technicianId ? { technicianId: query.technicianId } : {}),
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: jobs.length,
      jobs,
    };
  }

  async completedRepairs(query: ServiceReportQueryDto) {
    const completedAt = this.getServiceDateRange(query);

    const jobs = await this.prisma.serviceJob.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.technicianId ? { technicianId: query.technicianId } : {}),
        status: 'COMPLETED',
        ...(Object.keys(completedAt).length
          ? {
              completedAt: completedAt,
            }
          : {}),
      },
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
      orderBy: {
        completedAt: 'asc',
      },
    });

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: jobs.length,
      jobs,
    };
  }

  async pendingRepairs(query: ServiceReportQueryDto) {
    const createdAt = this.getServiceDateRange(query);

    const jobs = await this.prisma.serviceJob.findMany({
      where: {
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
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: jobs.length,
      jobs,
    };
  }

  async servicePartsUsed(query: ServiceReportQueryDto) {
    const createdAt = this.getServiceDateRange(query);

    const parts = await this.prisma.serviceJobPart.findMany({
      where: {
        issuedQuantity: {
          gt: 0,
        },
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.branchId
          ? {
              serviceJob: {
                branchId: query.branchId,
              },
            }
          : {}),
        ...(query.customerId
          ? {
              serviceJob: {
                customerId: query.customerId,
              },
            }
          : {}),
        ...(query.technicianId
          ? {
              serviceJob: {
                technicianId: query.technicianId,
              },
            }
          : {}),
        ...(Object.keys(createdAt).length
          ? {
              serviceJob: {
                createdAt,
              },
            }
          : {}),
      },
      include: {
        product: true,
        serviceJob: {
          include: {
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
      orderBy: {
        serviceJob: {
          createdAt: 'asc',
        },
      },
    });

    const totalCost = parts.reduce(
      (sum, part) => sum.add(part.totalCost),
      new Prisma.Decimal(0),
    );

    const totalQuantity = parts.reduce(
      (sum, part) => sum + part.issuedQuantity,
      0,
    );

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: parts.length,
      totalQuantity,
      totalCost: totalCost.toDecimalPlaces(2),
      parts,
    };
  }

  async serviceRevenue(query: ServiceReportQueryDto) {
    const invoiceDate = this.getServiceDateRange(query);

    const invoices = await this.prisma.serviceInvoice.findMany({
      where: {
        status: 'POSTED',
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(Object.keys(invoiceDate).length ? { invoiceDate } : {}),
      },
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
      orderBy: {
        invoiceDate: 'asc',
      },
    });

    const totalRevenue = invoices.reduce(
      (sum, invoice) => sum.add(invoice.total),
      new Prisma.Decimal(0),
    );

    const laborRevenue = invoices
      .flatMap((invoice) => invoice.items)
      .filter((item) => item.itemType === 'LABOR')
      .reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));

    const partsRevenue = invoices
      .flatMap((invoice) => invoice.items)
      .filter((item) => item.itemType === 'PART')
      .reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));

    const otherRevenue = invoices
      .flatMap((invoice) => invoice.items)
      .filter((item) => item.itemType === 'OTHER')
      .reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      invoiceCount: invoices.length,
      totalRevenue: totalRevenue.toDecimalPlaces(2),
      laborRevenue: laborRevenue.toDecimalPlaces(2),
      partsRevenue: partsRevenue.toDecimalPlaces(2),
      otherRevenue: otherRevenue.toDecimalPlaces(2),
      invoices,
    };
  }

  async technicianPerformance(query: ServiceReportQueryDto) {
    const createdAt = this.getServiceDateRange(query);

    const jobs = await this.prisma.serviceJob.findMany({
      where: {
        technicianId: {
          not: null,
        },
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.technicianId ? { technicianId: query.technicianId } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
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
        invoice: {
          select: {
            status: true,
            total: true,
          },
        },
      },
    });

    const grouped = new Map<
      string,
      {
        technician: NonNullable<(typeof jobs)[number]['technician']>;
        totalJobs: number;
        completedJobs: number;
        activeJobs: number;
        cancelledJobs: number;
        serviceRevenue: Prisma.Decimal;
      }
    >();

    for (const job of jobs) {
      if (!job.technician) {
        continue;
      }

      const existing = grouped.get(job.technician.id);

      const revenue =
        job.invoice?.status === 'POSTED'
          ? job.invoice.total
          : new Prisma.Decimal(0);

      if (!existing) {
        grouped.set(job.technician.id, {
          technician: job.technician,
          totalJobs: 1,
          completedJobs: job.status === 'COMPLETED' ? 1 : 0,
          activeJobs:
            job.status !== 'COMPLETED' && job.status !== 'CANCELLED' ? 1 : 0,
          cancelledJobs: job.status === 'CANCELLED' ? 1 : 0,
          serviceRevenue: revenue,
        });

        continue;
      }

      existing.totalJobs += 1;

      if (job.status === 'COMPLETED') {
        existing.completedJobs += 1;
      }

      if (job.status !== 'COMPLETED' && job.status !== 'CANCELLED') {
        existing.activeJobs += 1;
      }

      if (job.status === 'CANCELLED') {
        existing.cancelledJobs += 1;
      }

      existing.serviceRevenue = existing.serviceRevenue.add(revenue);
    }

    const technicians = Array.from(grouped.values()).map((item) => ({
      technician: item.technician,
      totalJobs: item.totalJobs,
      completedJobs: item.completedJobs,
      activeJobs: item.activeJobs,
      cancelledJobs: item.cancelledJobs,
      completionRate:
        item.totalJobs > 0
          ? Number(((item.completedJobs / item.totalJobs) * 100).toFixed(2))
          : 0,
      serviceRevenue: item.serviceRevenue.toDecimalPlaces(2),
    }));

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: technicians.length,
      technicians,
    };
  }

  async balanceSheet(query: ManagementReportQueryDto) {
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

  async cashFlow(query: ManagementReportQueryDto) {
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

  async salesProfitability(query: ManagementReportQueryDto) {
    const statement = await this.incomeStatement(query);

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

  async inventoryValuation(query: ManagementReportQueryDto) {
    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      include: {
        branch: true,
        product: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
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

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const totalValue = items.reduce(
      (sum, item) => sum.add(item.inventoryValue),
      new Prisma.Decimal(0),
    );

    return {
      asOfDate: query.asOfDate ?? new Date().toISOString(),

      count: items.length,

      totalQuantity,

      totalValue: totalValue.toDecimalPlaces(2),

      items,
    };
  }

  async arApAging(query: ManagementReportQueryDto) {
    const asOfDate = this.getManagementAsOfDate(query.asOfDate);

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
        },
        include: {
          customer: true,
        },
        orderBy: {
          dueDate: 'asc',
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
        },
        include: {
          supplier: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      }),
    ]);

    const bucket = (dueDate: Date | null) => {
      if (!dueDate) {
        return 'NO_DUE_DATE';
      }

      const diffMs = asOfDate.getTime() - dueDate.getTime();

      if (diffMs <= 0) {
        return 'CURRENT';
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (days <= 30) {
        return '1_30';
      }

      if (days <= 60) {
        return '31_60';
      }

      if (days <= 90) {
        return '61_90';
      }

      return '91_PLUS';
    };

    const createBuckets = () => ({
      CURRENT: new Prisma.Decimal(0),
      '1_30': new Prisma.Decimal(0),
      '31_60': new Prisma.Decimal(0),
      '61_90': new Prisma.Decimal(0),
      '91_PLUS': new Prisma.Decimal(0),
      NO_DUE_DATE: new Prisma.Decimal(0),
    });

    const arBuckets = createBuckets();
    const apBuckets = createBuckets();

    for (const record of receivables) {
      const key = bucket(record.dueDate);

      arBuckets[key] = arBuckets[key].add(record.balanceDue);
    }

    for (const record of payables) {
      const key = bucket(record.dueDate);

      apBuckets[key] = apBuckets[key].add(record.balanceDue);
    }

    const serializeBuckets = (buckets: ReturnType<typeof createBuckets>) => ({
      current: buckets.CURRENT.toDecimalPlaces(2),
      '1_30': buckets['1_30'].toDecimalPlaces(2),
      '31_60': buckets['31_60'].toDecimalPlaces(2),
      '61_90': buckets['61_90'].toDecimalPlaces(2),
      '91_plus': buckets['91_PLUS'].toDecimalPlaces(2),
      noDueDate: buckets.NO_DUE_DATE.toDecimalPlaces(2),
    });

    const arTotal = receivables.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    const apTotal = payables.reduce(
      (sum, record) => sum.add(record.balanceDue),
      new Prisma.Decimal(0),
    );

    return {
      asOfDate,

      accountsReceivable: {
        count: receivables.length,
        total: arTotal.toDecimalPlaces(2),
        aging: serializeBuckets(arBuckets),
        records: receivables,
      },

      accountsPayable: {
        count: payables.length,
        total: apTotal.toDecimalPlaces(2),
        aging: serializeBuckets(apBuckets),
        records: payables,
      },
    };
  }

  async purchaseOrderReport(query: PurchasingReportQueryDto) {
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

  async purchasesBySupplier(query: PurchasingReportQueryDto) {
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

  async purchasesByDate(query: PurchasingReportQueryDto) {
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

  async outstandingPurchaseOrders(query: PurchasingReportQueryDto) {
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

  async inventoryStock(query: InventoryReportQueryDto) {
    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
      },

      include: {
        branch: true,
        product: {
          include: {
            category: true,
          },
        },
      },

      orderBy: [
        {
          product: {
            name: 'asc',
          },
        },
      ],
    });

    const totalQuantity = balances.reduce(
      (sum, balance) => sum + balance.quantity,
      0,
    );

    const totalValue = balances.reduce(
      (sum, balance) => sum.add(balance.averageCost.mul(balance.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      count: balances.length,
      totalQuantity,
      totalValue: totalValue.toDecimalPlaces(2),
      items: balances.map((balance) => ({
        branchId: balance.branchId,
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
    };
  }

  async stockCard(query: InventoryReportQueryDto) {
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

  async inventoryValuationReport(query: InventoryReportQueryDto) {
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

  async lowStock(query: InventoryReportQueryDto) {
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

  async inventoryMovement(query: InventoryReportQueryDto) {
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

  async physicalCountAdjustments(query: InventoryReportQueryDto) {
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
