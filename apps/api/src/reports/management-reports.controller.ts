import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { ManagementReportQueryDto } from './dto/management-report-query.dto.js';

@Controller('reports/management')
export class ManagementReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('income-statement')
  incomeStatement(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.incomeStatement(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('balance-sheet')
  balanceSheet(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.balanceSheet(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('cash-flow')
  cashFlow(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.cashFlow(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('sales-profitability')
  salesProfitability(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.salesProfitability(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('inventory-valuation')
  inventoryValuation(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.inventoryValuation(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('ar-ap-aging')
  arApAging(
    @Query() query: ManagementReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.arApAging(query, user);
  }
}
