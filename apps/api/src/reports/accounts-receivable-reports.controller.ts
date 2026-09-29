import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { AccountsReceivableReportQueryDto } from './dto/accounts-receivable-report-query.dto.js';

@Controller('reports/accounts-receivable')
export class AccountsReceivableReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('customer-balances')
  customerBalances(
    @Query() query: AccountsReceivableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.accountsReceivableCustomerBalances(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('outstanding')
  outstandingReceivables(
    @Query() query: AccountsReceivableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.outstandingReceivables(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('aging')
  agingOfReceivables(
    @Query() query: AccountsReceivableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.agingOfReceivables(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get('collections')
  collections(
    @Query() query: AccountsReceivableReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.accountsReceivableCollections(query, user);
  }
}
