import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateAccountsPayableDto } from './dto/create-accounts-payable.dto.js';

import type { AccountsPayableWithRelations } from './accounts-payable.types.js';

import { AccountsPayableService } from './accounts-payable.service.js';
import { AccountsPayableQueryDto } from './dto/accounts-payable-query.dto.js';

@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreateAccountsPayableDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.createFromInvoice(dto, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get()
  findAll(
    @Query() query: AccountsPayableQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accountsPayableService.findAll(user, query);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccountsPayableWithRelations> {
    return this.accountsPayableService.findOne(id, user);
  }
}
