import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@computer-sales/database';
import { PrismaService } from '../database/prisma.service.js';
import { CashBankReportQueryDto } from './dto/cash-bank-report-query.dto.js';
import { PettyCashReportQueryDto } from './dto/petty-cash-report-query.dto.js';
import { AccountsReceivableReportQueryDto } from './dto/accounts-receivable-report-query.dto.js';
import { AccountsPayableReportQueryDto } from './dto/accounts-payable-report-query.dto.js';
import { SalesReportQueryDto } from './dto/sales-report-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
