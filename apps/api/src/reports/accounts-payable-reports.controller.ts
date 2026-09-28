import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { AccountsPayableReportQueryDto } from './dto/accounts-payable-report-query.dto.js';

@Controller('reports/accounts-payable')
export class AccountsPayableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('supplier-balances')
  supplierBalances(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.accountsPayableSupplierBalances(query);
  }

  @Get('outstanding')
  outstandingPayables(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.outstandingPayables(query);
  }

  @Get('due-overdue')
  dueOverduePayables(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.dueOverduePayables(query);
  }

  @Get('payment-history')
  paymentHistory(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.accountsPayablePaymentHistory(query);
  }
}
