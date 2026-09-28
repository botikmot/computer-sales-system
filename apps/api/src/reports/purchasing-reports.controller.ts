import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { PurchasingReportQueryDto } from './dto/purchasing-report-query.dto.js';

@Controller('reports/purchasing')
export class PurchasingReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('purchase-orders')
  purchaseOrderReport(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchaseOrderReport(query);
  }

  @Get('by-supplier')
  purchasesBySupplier(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchasesBySupplier(query);
  }

  @Get('by-date')
  purchasesByDate(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchasesByDate(query);
  }

  @Get('outstanding')
  outstandingPurchaseOrders(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.outstandingPurchaseOrders(query);
  }
}
