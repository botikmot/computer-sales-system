import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateAccountsPayableDto } from './dto/create-accounts-payable.dto.js';

import type { AccountsPayableWithRelations } from './accounts-payable.types.js';

import { AccountsPayableService } from './accounts-payable.service.js';

@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateAccountsPayableDto,
  ): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.createFromInvoice(dto);
  }

  @Get()
  findAll(): Promise<AccountsPayableWithRelations[]> {
    return this.accountsPayableService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.findOne(id);
  }
}
