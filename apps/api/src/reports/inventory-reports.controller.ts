import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto.js';

@Controller('reports/inventory')
export class InventoryReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock')
  inventoryStock(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryStock(query);
  }

  @Get('stock-card')
  stockCard(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.stockCard(query);
  }

  @Get('valuation')
  inventoryValuation(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryValuationReport(query);
  }

  @Get('low-stock')
  lowStock(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.lowStock(query);
  }

  @Get('movement')
  inventoryMovement(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.inventoryMovement(query);
  }

  @Get('adjustments')
  physicalCountAdjustments(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.physicalCountAdjustments(query);
  }
}
