import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { SalesReportQueryDto } from './dto/sales-report-query.dto.js';

@Controller('reports/sales')
export class SalesReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('daily')
  dailySales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.dailySales(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('monthly')
  monthlySales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.monthlySales(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-customer')
  salesByCustomer(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesByCustomer(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-product')
  salesByProduct(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesByProduct(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-salesperson')
  salesBySalesperson(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesBySalesperson(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('returns')
  salesReturns(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesReturns(query);
  }
}
