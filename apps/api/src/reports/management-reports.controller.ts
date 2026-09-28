import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { ManagementReportQueryDto } from './dto/management-report-query.dto.js';

@Controller('reports/management')
export class ManagementReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income-statement')
  incomeStatement(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.incomeStatement(query);
  }

  @Get('balance-sheet')
  balanceSheet(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.balanceSheet(query);
  }

  @Get('cash-flow')
  cashFlow(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.cashFlow(query);
  }

  @Get('sales-profitability')
  salesProfitability(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.salesProfitability(query);
  }

  @Get('inventory-valuation')
  inventoryValuation(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.inventoryValuation(query);
  }

  @Get('ar-ap-aging')
  arApAging(@Query() query: ManagementReportQueryDto) {
    return this.reportsService.arApAging(query);
  }
}
