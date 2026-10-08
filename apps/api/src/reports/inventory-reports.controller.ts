import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { InventoryReportQueryDto } from './dto/inventory-report-query.dto.js';

@Controller('reports/inventory')
export class InventoryReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY, UserRole.SALES)
  @Get('stock')
  inventoryStock(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.inventoryStock(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('stock-card')
  stockCard(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.stockCard(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('valuation')
  inventoryValuation(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.inventoryValuationReport(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('low-stock')
  lowStock(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.lowStock(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('movement')
  inventoryMovement(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.inventoryMovement(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('adjustments')
  physicalCountAdjustments(
    @Query() query: InventoryReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.physicalCountAdjustments(query, user);
  }
}
