import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { CashBankReportQueryDto } from './dto/cash-bank-report-query.dto.js';

@Controller('reports/cash-bank')
export class CashBankReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('daily')
  dailyCashReport(
    @Query() query: CashBankReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.dailyCashReport(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('receipts')
  cashReceipts(
    @Query() query: CashBankReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.cashReceipts(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('disbursements')
  cashDisbursements(
    @Query() query: CashBankReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.cashDisbursements(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('transactions')
  bankTransactions(
    @Query() query: CashBankReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.bankTransactions(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliation')
  bankReconciliation(
    @Query() query: CashBankReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.bankReconciliation(query, user);
  }
}
