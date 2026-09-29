import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CashBankService } from './cash-bank.service.js';

import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto.js';
import { AddBankReconciliationItemDto } from './dto/add-bank-reconciliation-item.dto.js';
import { CreateCashBankTransactionDto } from './dto/create-cash-bank-transaction.dto.js';

@Controller('cash-bank')
export class CashBankController {
  constructor(private readonly cashBankService: CashBankService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('reconciliations')
  create(@Body() dto: CreateBankReconciliationDto) {
    return this.cashBankService.createReconciliation(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliations')
  findAll(
    @Query('branchId') branchId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.cashBankService.findAll(branchId, accountId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('transactions')
  createTransaction(@Body() dto: CreateCashBankTransactionDto) {
    return this.cashBankService.createManualTransaction(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliations/:id')
  findOne(@Param('id') id: string) {
    return this.cashBankService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('reconciliations/:id/items')
  addItem(@Param('id') id: string, @Body() dto: AddBankReconciliationItemDto) {
    return this.cashBankService.addItem(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('reconciliations/:id/complete')
  complete(@Param('id') id: string) {
    return this.cashBankService.complete(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('reconciliations/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.cashBankService.cancel(id);
  }
}
