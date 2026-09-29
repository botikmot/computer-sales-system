import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { ManagementReportQueryDto } from './dto/management-report-query.dto.js';

@Controller('reports/management')
export class ManagementReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('income-statement')
  incomeStatement(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.incomeStatement(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('balance-sheet')
  balanceSheet(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.balanceSheet(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('cash-flow')
  cashFlow(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.cashFlow(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('sales-profitability')
  salesProfitability(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.salesProfitability(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('inventory-valuation')
  inventoryValuation(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.inventoryValuation(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('ar-ap-aging')
  arApAging(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.arApAging(query);
  }
}
