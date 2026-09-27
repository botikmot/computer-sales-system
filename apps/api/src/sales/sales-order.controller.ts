import { Controller, Get, Param, Post } from '@nestjs/common';

import { SalesOrderService } from './sales-order.service.js';

@Controller('sales/orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Post('from-quotation/:quotationId')
  createFromQuotation(
    @Param('quotationId')
    quotationId: string,
  ) {
    return this.salesOrderService.createFromQuotation(quotationId);
  }

  @Get()
  findAll() {
    return this.salesOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrderService.findOne(id);
  }
}
