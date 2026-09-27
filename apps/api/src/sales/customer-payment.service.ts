import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto.js';

@Injectable()
export class CustomerPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerPaymentDto) {
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lte(0)) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: {
          id: dto.salesInvoiceId,
        },
        include: {
          customer: true,
          branch: true,
          accountsReceivable: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      if (invoice.status !== 'POSTED') {
        throw new BadRequestException(
          'Only posted sales invoices can receive payment.',
        );
      }

      if (invoice.balanceDue.lte(0)) {
        throw new BadRequestException(
          'This sales invoice has no outstanding balance.',
        );
      }

      if (amount.gt(invoice.balanceDue)) {
        throw new BadRequestException(
          'Payment amount cannot exceed the outstanding invoice balance.',
        );
      }

      const account = await tx.cashBankAccount.findUnique({
        where: {
          id: dto.accountId,
        },
      });

      if (!account) {
        throw new NotFoundException('Cash/Bank account not found.');
      }

      if (!account.isActive) {
        throw new BadRequestException('Cash/Bank account is inactive.');
      }

      if (account.branchId !== invoice.branchId) {
        throw new BadRequestException(
          'Cash/Bank account does not belong to the invoice branch.',
        );
      }

      // --------------------------------------------------
      // SALES INVOICE BALANCE
      // --------------------------------------------------

      const newAmountPaid = invoice.amountPaid.plus(amount);

      const newBalanceDue = invoice.balanceDue.minus(amount);

      // --------------------------------------------------
      // ACCOUNTS RECEIVABLE
      // CREDIT invoices only
      // --------------------------------------------------

      if (invoice.paymentMode === 'CREDIT') {
        if (!invoice.accountsReceivable) {
          throw new BadRequestException(
            'Accounts receivable record is missing for this credit sales invoice.',
          );
        }

        const newArAmountPaid =
          invoice.accountsReceivable.amountPaid.plus(amount);

        const newArBalanceDue =
          invoice.accountsReceivable.balanceDue.minus(amount);

        const arStatus = newArBalanceDue.eq(0) ? 'PAID' : 'PARTIALLY_PAID';

        await tx.accountsReceivable.update({
          where: {
            id: invoice.accountsReceivable.id,
          },
          data: {
            amountPaid: newArAmountPaid,
            balanceDue: newArBalanceDue,
            status: arStatus,
          },
        });
      }

      // --------------------------------------------------
      // CUSTOMER PAYMENT
      // --------------------------------------------------

      const paymentNo = `CP-${this.generateReference()}`;

      const payment = await tx.customerPayment.create({
        data: {
          paymentNo,
          branchId: invoice.branchId,
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          accountId: account.id,

          amount,

          paymentDate,

          referenceNo: dto.referenceNo,
          notes: dto.notes,
          status: 'POSTED',
        },
      });

      // --------------------------------------------------
      // UPDATE SALES INVOICE
      // --------------------------------------------------

      await tx.salesInvoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
        },
      });

      // --------------------------------------------------
      // CASH / BANK TRANSACTION
      // --------------------------------------------------

      await tx.cashBankTransaction.create({
        data: {
          branchId: invoice.branchId,

          customerPaymentId: payment.id,

          accountId: account.id,
          accountType: account.accountType,
          accountName: account.name,

          transactionType: 'CUSTOMER_PAYMENT',
          direction: 'IN',

          amount,

          transactionDate: paymentDate,

          referenceNo: dto.referenceNo,
          notes: dto.notes,
        },
      });

      // --------------------------------------------------
      // RETURN FULL PAYMENT
      // --------------------------------------------------

      return tx.customerPayment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },
        include: {
          branch: true,
          customer: true,
          salesInvoice: {
            include: {
              accountsReceivable: true,
            },
          },
          account: true,
          cashBankTransaction: true,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.customerPayment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        salesInvoice: true,
        account: true,
        cashBankTransaction: true,
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.customerPayment.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        salesInvoice: true,
        account: true,
        cashBankTransaction: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Customer payment not found.');
    }

    return payment;
  }

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }
}
