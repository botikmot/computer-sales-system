import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { AccountsPayableReportQueryDto } from './dto/accounts-payable-report-query.dto.js';

@Controller('reports/accounts-payable')
export class AccountsPayableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('supplier-balances')
  supplierBalances(
    @Query() query: AccountsPayableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.accountsPayableSupplierBalances(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('outstanding')
  outstandingPayables(
    @Query() query: AccountsPayableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.outstandingPayables(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('due-overdue')
  dueOverduePayables(
    @Query() query: AccountsPayableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.dueOverduePayables(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('payment-history')
  paymentHistory(
    @Query() query: AccountsPayableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.accountsPayablePaymentHistory(query, user);
  }
}
