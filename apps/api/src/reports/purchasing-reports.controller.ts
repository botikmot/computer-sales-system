import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { PurchasingReportQueryDto } from './dto/purchasing-report-query.dto.js';

@Controller('reports/purchasing')
export class PurchasingReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('purchase-orders')
  purchaseOrderReport(
    @Query() query: PurchasingReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.purchaseOrderReport(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('by-supplier')
  purchasesBySupplier(
    @Query() query: PurchasingReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.purchasesBySupplier(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('by-date')
  purchasesByDate(
    @Query() query: PurchasingReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.purchasesByDate(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('outstanding')
  outstandingPurchaseOrders(
    @Query() query: PurchasingReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.outstandingPurchaseOrders(query, user);
  }
}
