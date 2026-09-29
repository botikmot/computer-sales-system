import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { AccountsReceivableReportQueryDto } from './dto/accounts-receivable-report-query.dto.js';

@Controller('reports/accounts-receivable')
export class AccountsReceivableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('customer-balances')
  customerBalances(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.accountsReceivableCustomerBalances(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('outstanding')
  outstandingReceivables(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.outstandingReceivables(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('aging')
  agingOfReceivables(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.agingOfReceivables(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('collections')
  collections(@Query() query: AccountsReceivableReportQueryDto) {
    return this.reportsService.accountsReceivableCollections(query);
  }
}
