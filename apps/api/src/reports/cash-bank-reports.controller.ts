import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { CashBankReportQueryDto } from './dto/cash-bank-report-query.dto.js';

@Controller('reports/cash-bank')
export class CashBankReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('daily')
  dailyCashReport(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.dailyCashReport(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('receipts')
  cashReceipts(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.cashReceipts(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('disbursements')
  cashDisbursements(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.cashDisbursements(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('transactions')
  bankTransactions(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.bankTransactions(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('reconciliation')
  bankReconciliation(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.bankReconciliation(query);
  }
}
