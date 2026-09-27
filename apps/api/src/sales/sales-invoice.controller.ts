import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { SalesInvoiceService } from './sales-invoice.service.js';

@Controller('sales/invoices')
export class SalesInvoiceController {
  constructor(private readonly salesInvoiceService: SalesInvoiceService) {}

  @Post('from-order/:salesOrderId')
  createFromOrder(
    @Param('salesOrderId')
    salesOrderId: string,
    @Body()
    body: {
      paymentMode: 'CASH' | 'CREDIT';
    },
  ) {
    return this.salesInvoiceService.createFromSalesOrder(
      salesOrderId,
      body.paymentMode,
    );
  }

  @Get()
  findAll() {
    return this.salesInvoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInvoiceService.findOne(id);
  }
}
