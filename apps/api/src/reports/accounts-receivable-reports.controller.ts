import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { AccountsReceivableReportQueryDto } from './dto/accounts-receivable-report-query.dto.js';

@Controller('reports/accounts-receivable')
export class AccountsReceivableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('customer-balances')
  customerBalances(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.accountsReceivableCustomerBalances(query);
  }

  @Get('outstanding')
  outstandingReceivables(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.outstandingReceivables(query);
  }

  @Get('aging')
  agingOfReceivables(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.agingOfReceivables(query);
  }

  @Get('collections')
  collections(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.accountsReceivableCollections(query);
  }
}
