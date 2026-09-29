import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { PurchasingReportQueryDto } from './dto/purchasing-report-query.dto.js';

@Controller('reports/purchasing')
export class PurchasingReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('purchase-orders')
  purchaseOrderReport(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchaseOrderReport(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('by-supplier')
  purchasesBySupplier(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchasesBySupplier(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('by-date')
  purchasesByDate(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.purchasesByDate(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('outstanding')
  outstandingPurchaseOrders(@Query() query: PurchasingReportQueryDto) {
    return this.reportsService.outstandingPurchaseOrders(query);
  }
}
