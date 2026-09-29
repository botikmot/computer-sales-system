import { Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { PaymentVoucherService } from './payment-voucher.service.js';

@Controller('payment-vouchers')
export class PaymentVoucherController {
  constructor(private readonly paymentVoucherService: PaymentVoucherService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('from-payment/:supplierPaymentId')
  createFromPayment(
    @Param('supplierPaymentId')
    supplierPaymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentVoucherService.createFromSupplierPayment(
      supplierPaymentId,
      user,
    );
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentVoucherService.findAll(user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentVoucherService.findOne(id, user);
  }
}
