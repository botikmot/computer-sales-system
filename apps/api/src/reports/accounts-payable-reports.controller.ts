import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { AccountsPayableReportQueryDto } from './dto/accounts-payable-report-query.dto.js';

@Controller('reports/accounts-payable')
export class AccountsPayableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('supplier-balances')
  supplierBalances(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.accountsPayableSupplierBalances(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('outstanding')
  outstandingPayables(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.outstandingPayables(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('due-overdue')
  dueOverduePayables(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.dueOverduePayables(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('payment-history')
  paymentHistory(@Query() query: AccountsPayableReportQueryDto) {
    return this.reportsService.accountsPayablePaymentHistory(query);
  }
}
