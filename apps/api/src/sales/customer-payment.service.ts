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

    const hasSalesInvoice = Boolean(dto.salesInvoiceId);
    const hasServiceInvoice = Boolean(dto.serviceInvoiceId);

    if (hasSalesInvoice === hasServiceInvoice) {
      throw new BadRequestException(
        'Payment must reference exactly one sales invoice or service invoice.',
      );
    }

    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      let invoice: any;
      let invoiceType: 'SALES' | 'SERVICE';

      if (dto.salesInvoiceId) {
        invoiceType = 'SALES';

        invoice = await tx.salesInvoice.findUnique({
          where: {
            id: dto.salesInvoiceId,
          },
          include: {
            customer: true,
            branch: true,
            accountsReceivable: true,
          },
        });
      } else {
        invoiceType = 'SERVICE';

        invoice = await tx.serviceInvoice.findUnique({
          where: {
            id: dto.serviceInvoiceId,
          },
          include: {
            customer: true,
            branch: true,
            accountsReceivable: true,
          },
        });
      }

      if (!invoice) {
        throw new NotFoundException(
          invoiceType === 'SALES'
            ? 'Sales invoice not found.'
            : 'Service invoice not found.',
        );
      }

      if (invoice.status !== 'POSTED') {
        throw new BadRequestException(
          'Only posted invoices can receive payment.',
        );
      }

      if (invoice.balanceDue.lte(0)) {
        throw new BadRequestException(
          'This invoice has no outstanding balance.',
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

      if (invoice.paymentMode === 'CREDIT' && !invoice.accountsReceivable) {
        throw new BadRequestException(
          'Accounts receivable record is missing for this credit invoice.',
        );
      }

      if (invoice.paymentMode === 'CASH' && invoice.accountsReceivable) {
        throw new BadRequestException(
          'CASH invoice unexpectedly has an accounts receivable record.',
        );
      }

      const newAmountPaid = invoice.amountPaid.plus(amount);

      const newBalanceDue = invoice.balanceDue.minus(amount);

      // -----------------------------
      // UPDATE ACCOUNTS RECEIVABLE
      // -----------------------------

      if (invoice.paymentMode === 'CREDIT') {
        const ar = invoice.accountsReceivable;

        const newArAmountPaid = ar.amountPaid.plus(amount);

        const newArBalanceDue = ar.balanceDue.minus(amount);

        const arStatus = newArBalanceDue.eq(0) ? 'PAID' : 'PARTIALLY_PAID';

        await tx.accountsReceivable.update({
          where: {
            id: ar.id,
          },
          data: {
            amountPaid: newArAmountPaid,
            balanceDue: newArBalanceDue,
            status: arStatus,
          },
        });
      }

      // -----------------------------
      // CREATE CUSTOMER PAYMENT
      // -----------------------------

      const paymentNo = `CP-${this.generateReference()}`;

      const payment = await tx.customerPayment.create({
        data: {
          paymentNo,

          branchId: invoice.branchId,
          customerId: invoice.customerId,

          salesInvoiceId: invoiceType === 'SALES' ? invoice.id : null,

          serviceInvoiceId: invoiceType === 'SERVICE' ? invoice.id : null,

          accountId: account.id,

          amount,
          paymentDate,

          referenceNo: dto.referenceNo,
          notes: dto.notes,

          status: 'POSTED',
        },
      });

      // -----------------------------
      // UPDATE INVOICE
      // -----------------------------

      if (invoiceType === 'SALES') {
        await tx.salesInvoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
          },
        });
      } else {
        await tx.serviceInvoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
          },
        });
      }

      // -----------------------------
      // CASH / BANK
      // -----------------------------

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

      // -----------------------------
      // RETURN
      // -----------------------------

      return tx.customerPayment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },
        include: {
          branch: true,
          customer: true,

          salesInvoice: true,
          serviceInvoice: true,

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
        serviceInvoice: true,
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
        serviceInvoice: true,
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
