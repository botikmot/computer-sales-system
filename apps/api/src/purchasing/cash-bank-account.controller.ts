import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateCashBankAccountDto } from './dto/create-cash-bank-account.dto.js';
import { CashBankAccountService } from './cash-bank-account.service.js';

@Controller('cash-bank/accounts')
export class CashBankAccountController {
  constructor(
    private readonly cashBankAccountService: CashBankAccountService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateCashBankAccountDto) {
    return this.cashBankAccountService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get()
  findAll() {
    return this.cashBankAccountService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cashBankAccountService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.cashBankAccountService.getBalance(id);
  }
}
