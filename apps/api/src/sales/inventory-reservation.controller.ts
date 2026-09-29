import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReleaseSalesOrderDto } from './dto/release-sales-order.dto.js';

import { InventoryReservationService } from './inventory-reservation.service.js';

@Controller('sales/orders')
export class InventoryReservationController {
  constructor(
    private readonly inventoryReservationService: InventoryReservationService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.INVENTORY)
  @Get(':salesOrderId/inventory-check')
  checkAvailability(@Param('salesOrderId') salesOrderId: string) {
    return this.inventoryReservationService.checkAvailability(salesOrderId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.INVENTORY)
  @Post(':salesOrderId/reserve')
  reserve(@Param('salesOrderId') salesOrderId: string) {
    return this.inventoryReservationService.reserve(salesOrderId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.INVENTORY)
  @Post(':salesOrderId/prepare')
  prepare(@Param('salesOrderId') salesOrderId: string) {
    return this.inventoryReservationService.prepare(salesOrderId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.INVENTORY)
  @Post(':salesOrderId/release')
  release(
    @Param('salesOrderId') salesOrderId: string,
    @Body() dto: ReleaseSalesOrderDto,
  ) {
    return this.inventoryReservationService.release(salesOrderId, dto);
  }
}
