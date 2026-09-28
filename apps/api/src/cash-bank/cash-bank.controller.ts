import {
  Body,
  Controller,
  Get,
  Param,
  //Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CashBankService } from './cash-bank.service.js';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto.js';
import { AddBankReconciliationItemDto } from './dto/add-bank-reconciliation-item.dto.js';
import { CreateCashBankTransactionDto } from './dto/create-cash-bank-transaction.dto.js';

@Controller('cash-bank')
export class CashBankController {
  constructor(private readonly cashBankService: CashBankService) {}

  @Post('reconciliations')
  create(@Body() dto: CreateBankReconciliationDto) {
    return this.cashBankService.createReconciliation(dto);
  }

  @Get('reconciliations')
  findAll(
    @Query('branchId') branchId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.cashBankService.findAll(branchId, accountId);
  }

  @Post('transactions')
  createTransaction(@Body() dto: CreateCashBankTransactionDto) {
    return this.cashBankService.createManualTransaction(dto);
  }

  @Get('reconciliations/:id')
  findOne(@Param('id') id: string) {
    return this.cashBankService.findOne(id);
  }

  @Post('reconciliations/:id/items')
  addItem(@Param('id') id: string, @Body() dto: AddBankReconciliationItemDto) {
    return this.cashBankService.addItem(id, dto);
  }

  @Post('reconciliations/:id/complete')
  complete(@Param('id') id: string) {
    return this.cashBankService.complete(id);
  }

  @Post('reconciliations/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.cashBankService.cancel(id);
  }
}
