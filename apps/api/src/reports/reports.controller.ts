import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { CashBankReportQueryDto } from './dto/cash-bank-report-query.dto.js';

@Controller('reports/cash-bank')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  dailyCashReport(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.dailyCashReport(query);
  }

  @Get('receipts')
  cashReceipts(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.cashReceipts(query);
  }

  @Get('disbursements')
  cashDisbursements(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.cashDisbursements(query);
  }

  @Get('transactions')
  bankTransactions(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.bankTransactions(query);
  }

  @Get('reconciliation')
  bankReconciliation(@Query() query: CashBankReportQueryDto) {
    return this.reportsService.bankReconciliation(query);
  }
}
