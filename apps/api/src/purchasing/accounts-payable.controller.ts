import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateAccountsPayableDto } from './dto/create-accounts-payable.dto.js';

import type { AccountsPayableWithRelations } from './accounts-payable.types.js';

import { AccountsPayableService } from './accounts-payable.service.js';

@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreateAccountsPayableDto,
  ): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.createFromInvoice(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(): Promise<AccountsPayableWithRelations[]> {
    return this.accountsPayableService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.findOne(id);
  }
}
