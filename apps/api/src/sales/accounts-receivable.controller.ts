import { Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { AccountsReceivableService } from './accounts-receivable.service.js';

@Controller('sales/accounts-receivable')
export class AccountsReceivableController {
  constructor(
    private readonly accountsReceivableService: AccountsReceivableService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll() {
    return this.accountsReceivableService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsReceivableService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-invoice/:salesInvoiceId')
  createFromInvoice(@Param('salesInvoiceId') salesInvoiceId: string) {
    return this.accountsReceivableService.createFromInvoice(salesInvoiceId);
  }
}
