import { Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { PaymentVoucherService } from './payment-voucher.service.js';

@Controller('payment-vouchers')
export class PaymentVoucherController {
  constructor(private readonly paymentVoucherService: PaymentVoucherService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('from-payment/:supplierPaymentId')
  createFromPayment(
    @Param('supplierPaymentId')
    supplierPaymentId: string,
  ) {
    return this.paymentVoucherService.createFromSupplierPayment(
      supplierPaymentId,
    );
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get()
  findAll() {
    return this.paymentVoucherService.findAll();
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentVoucherService.findOne(id);
  }
}
