import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateCashBankAccountDto } from './dto/create-cash-bank-account.dto.js';
import { CashBankAccountService } from './cash-bank-account.service.js';

@Controller('cash-bank/accounts')
export class CashBankAccountController {
  constructor(
    private readonly cashBankAccountService: CashBankAccountService,
  ) {}

  @Post()
  create(@Body() dto: CreateCashBankAccountDto) {
    return this.cashBankAccountService.create(dto);
  }

  @Get()
  findAll() {
    return this.cashBankAccountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cashBankAccountService.findOne(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.cashBankAccountService.getBalance(id);
  }
}
