import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateCashBankAccountDto } from './dto/create-cash-bank-account.dto.js';

import { CashBankAccountService } from './cash-bank-account.service.js';

@Controller('cash-bank/accounts')
export class CashBankAccountController {
  constructor(
    private readonly cashBankAccountService: CashBankAccountService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  create(
    @Body() dto: CreateCashBankAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashBankAccountService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cashBankAccountService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cashBankAccountService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get(':id/balance')
  getBalance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cashBankAccountService.getBalance(id, user);
  }
}
