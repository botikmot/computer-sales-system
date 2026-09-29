import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { InventoryReportQueryDto } from './dto/inventory-report-query.dto.js';

@Controller('reports/inventory')
export class InventoryReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('stock')
  inventoryStock(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryStock(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('stock-card')
  stockCard(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.stockCard(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('valuation')
  inventoryValuation(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryValuationReport(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('low-stock')
  lowStock(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.lowStock(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('movement')
  inventoryMovement(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryMovement(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('adjustments')
  physicalCountAdjustments(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.physicalCountAdjustments(query);
  }
}
