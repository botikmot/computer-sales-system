import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@computer-sales/database';
import { PrismaService } from '../database/prisma.service.js';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto.js';

@Injectable()
export class SupplierPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierPaymentDto) {
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lte(0)) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ap = await tx.accountsPayable.findUnique({
        where: {
          id: dto.accountsPayableId,
        },
        include: {
          supplier: true,
          branch: true,
          purchaseInvoice: true,
        },
      });

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

      if (account.branchId !== ap?.branchId) {
        throw new BadRequestException(
          'Cash/Bank account does not belong to the same branch.',
        );
      }

      if (!ap) {
        throw new NotFoundException('Accounts payable record not found.');
      }

      if (ap.status === 'CANCELLED') {
        throw new BadRequestException(
          'Cannot pay a cancelled accounts payable.',
        );
      }

      if (amount.gt(ap.balanceDue)) {
        throw new BadRequestException(
          'Payment amount cannot exceed the outstanding balance.',
        );
      }

      const newAmountPaid = ap.amountPaid.plus(amount);
      const newBalanceDue = ap.balanceDue.minus(amount);

      const newStatus = newBalanceDue.eq(0) ? 'PAID' : 'PARTIALLY_PAID';

      const paymentNo = `SP-${this.generateReference()}`;

      const payment = await tx.supplierPayment.create({
        data: {
          paymentNo,
          branchId: ap.branchId,
          supplierId: ap.supplierId,
          accountsPayableId: ap.id,

          accountId: account.id,
          accountType: account.accountType,

          amount,

          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),

          referenceNo: dto.referenceNo,
          notes: dto.notes,
          status: 'POSTED',
        },
      });

      await tx.accountsPayable.update({
        where: {
          id: ap.id,
        },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await tx.purchaseInvoice.update({
        where: {
          id: ap.purchaseInvoiceId,
        },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
        },
      });

      await tx.cashBankTransaction.create({
        data: {
          branchId: ap.branchId,
          supplierPaymentId: payment.id,

          accountId: account.id,
          accountType: account.accountType,
          accountName: account.name,

          transactionType: 'SUPPLIER_PAYMENT',
          direction: 'OUT',

          amount,

          transactionDate: dto.paymentDate
            ? new Date(dto.paymentDate)
            : new Date(),

          referenceNo: dto.referenceNo,
          notes: dto.notes,
        },
      });

      return tx.supplierPayment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },
        include: {
          branch: true,
          supplier: true,
          accountsPayable: true,
          cashBankTransaction: true,
        },
      });
    });
  }

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }

  async findAll() {
    return this.prisma.supplierPayment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        supplier: true,
        accountsPayable: true,
        cashBankTransaction: true,
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplier: true,
        accountsPayable: true,
        cashBankTransaction: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Supplier payment not found.');
    }

    return payment;
  }
}
