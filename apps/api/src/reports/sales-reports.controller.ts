import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { SalesReportQueryDto } from './dto/sales-report-query.dto.js';

@Controller('reports/sales')
export class SalesReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  dailySales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.dailySales(query);
  }

  @Get('monthly')
  monthlySales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.monthlySales(query);
  }

  @Get('by-customer')
  salesByCustomer(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesByCustomer(query);
  }

  @Get('by-product')
  salesByProduct(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesByProduct(query);
  }

  @Get('by-salesperson')
  salesBySalesperson(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesBySalesperson(query);
  }

  @Get('returns')
  salesReturns(@Query() query: SalesReportQueryDto) {
    return this.reportsService.salesReturns(query);
  }
}
