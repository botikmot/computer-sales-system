import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { InventoryReservationService } from './inventory-reservation.service.js';
import { ReleaseSalesOrderDto } from './dto/release-sales-order.dto.js';

@Controller('sales/orders')
export class InventoryReservationController {
  constructor(
    private readonly inventoryReservationService: InventoryReservationService,
  ) {}

  @Get(':salesOrderId/inventory-check')
  checkAvailability(
    @Param('salesOrderId')
    salesOrderId: string,
  ) {
    return this.inventoryReservationService.checkAvailability(salesOrderId);
  }

  @Post(':salesOrderId/reserve')
  reserve(
    @Param('salesOrderId')
    salesOrderId: string,
  ) {
    return this.inventoryReservationService.reserve(salesOrderId);
  }

  @Post(':salesOrderId/prepare')
  prepare(
    @Param('salesOrderId')
    salesOrderId: string,
  ) {
    return this.inventoryReservationService.prepare(salesOrderId);
  }

  @Post(':salesOrderId/release')
  release(
    @Param('salesOrderId')
    salesOrderId: string,
    @Body() dto: ReleaseSalesOrderDto,
  ) {
    return this.inventoryReservationService.release(salesOrderId, dto);
  }
}
