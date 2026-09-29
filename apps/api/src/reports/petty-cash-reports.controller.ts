import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { PettyCashReportQueryDto } from './dto/petty-cash-report-query.dto.js';

@Controller('reports/petty-cash')
export class PettyCashReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('transactions')
  transactions(
    @Query() query: PettyCashReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.pettyCashTransactions(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('vouchers')
  vouchers(
    @Query() query: PettyCashReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.pettyCashVouchers(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('replenishments')
  replenishments(
    @Query() query: PettyCashReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.pettyCashReplenishments(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('balance')
  balance(
    @Query() query: PettyCashReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.pettyCashBalance(query, user);
  }
}
