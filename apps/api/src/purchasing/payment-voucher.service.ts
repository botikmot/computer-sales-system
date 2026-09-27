import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { PaymentVoucherWithRelations } from './payment-voucher.types.js';

@Injectable()
export class PaymentVoucherService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromSupplierPayment(
    supplierPaymentId: string,
  ): Promise<PaymentVoucherWithRelations> {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: {
        id: supplierPaymentId,
      },
      include: {
        supplier: true,
        accountsPayable: true,
        account: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Supplier payment not found.');
    }

    const existing = await this.prisma.paymentVoucher.findUnique({
      where: {
        supplierPaymentId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Payment voucher already exists for this supplier payment.',
      );
    }

    const voucherNo = `PV-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    return this.prisma.paymentVoucher.create({
      data: {
        voucherNo,
        branchId: payment.branchId,
        supplierPaymentId: payment.id,
        voucherDate: payment.paymentDate,
        payeeName: payment.supplier.name,
        amount: payment.amount,
        purpose: 'Payment to supplier',
        notes: payment.notes,
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<PaymentVoucherWithRelations[]> {
    return this.prisma.paymentVoucher.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<PaymentVoucherWithRelations> {
    const voucher = await this.prisma.paymentVoucher.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplierPayment: {
          include: {
            supplier: true,
            accountsPayable: true,
            account: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException('Payment voucher not found.');
    }

    return voucher;
  }
}
