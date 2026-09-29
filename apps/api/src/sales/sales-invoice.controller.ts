import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { SalesInvoiceService } from './sales-invoice.service.js';

@Controller('sales/invoices')
export class SalesInvoiceController {
  constructor(private readonly salesInvoiceService: SalesInvoiceService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-order/:salesOrderId')
  createFromOrder(
    @Param('salesOrderId') salesOrderId: string,
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

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll() {
    return this.salesInvoiceService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInvoiceService.findOne(id);
  }
}
