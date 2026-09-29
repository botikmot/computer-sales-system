import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CashBankService } from './cash-bank.service.js';

import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto.js';
import { AddBankReconciliationItemDto } from './dto/add-bank-reconciliation-item.dto.js';
import { CreateCashBankTransactionDto } from './dto/create-cash-bank-transaction.dto.js';

@Controller('cash-bank')
export class CashBankController {
  constructor(private readonly cashBankService: CashBankService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('reconciliations')
  create(
    @Body() dto: CreateBankReconciliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashBankService.createReconciliation(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliations')
  findAll(
    @Query('branchId') branchId: string | undefined,
    @Query('accountId') accountId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashBankService.findAll(branchId, accountId, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('transactions')
  createTransaction(
    @Body() dto: CreateCashBankTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashBankService.createManualTransaction(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliations/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cashBankService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('reconciliations/:id/items')
  addItem(
    @Param('id') id: string,
    @Body() dto: AddBankReconciliationItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashBankService.addItem(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('reconciliations/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cashBankService.complete(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('reconciliations/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cashBankService.cancel(id, user);
  }
}
