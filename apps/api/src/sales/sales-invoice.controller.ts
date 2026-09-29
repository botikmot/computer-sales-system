import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesInvoiceService.createFromSalesOrder(
      salesOrderId,
      body.paymentMode,
      user,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.salesInvoiceService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesInvoiceService.findOne(id, user);
  }
}
