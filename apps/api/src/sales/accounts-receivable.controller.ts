import { Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { AccountsReceivableService } from './accounts-receivable.service.js';

@Controller('sales/accounts-receivable')
export class AccountsReceivableController {
  constructor(
    private readonly accountsReceivableService: AccountsReceivableService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.accountsReceivableService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountsReceivableService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-invoice/:salesInvoiceId')
  createFromInvoice(
    @Param('salesInvoiceId') salesInvoiceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsReceivableService.createFromInvoice(
      salesInvoiceId,
      user,
    );
  }
}
