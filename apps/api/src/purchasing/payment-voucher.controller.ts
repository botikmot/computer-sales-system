import { Controller, Get, Param, Post } from '@nestjs/common';

import { PaymentVoucherService } from './payment-voucher.service.js';

@Controller('payment-vouchers')
export class PaymentVoucherController {
  constructor(private readonly paymentVoucherService: PaymentVoucherService) {}

  @Post('from-payment/:supplierPaymentId')
  createFromPayment(
    @Param('supplierPaymentId')
    supplierPaymentId: string,
  ) {
    return this.paymentVoucherService.createFromSupplierPayment(
      supplierPaymentId,
    );
  }

  @Get()
  findAll() {
    return this.paymentVoucherService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentVoucherService.findOne(id);
  }
}
