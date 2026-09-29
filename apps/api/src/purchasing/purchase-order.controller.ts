import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';

import type {
  PurchaseOrderRecord,
  PurchaseOrderWithRelations,
} from './purchase-order.types.js';

import { PurchaseOrderService } from './purchase-order.service.js';

@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.createFromQuotation(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(): Promise<PurchaseOrderWithRelations[]> {
    return this.purchaseOrderService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id/approve')
  approve(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.approve(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id/send')
  markSent(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.markSent(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.cancel(id);
  }
}
