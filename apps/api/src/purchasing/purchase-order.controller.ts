import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';

import type {
  PurchaseOrderRecord,
  PurchaseOrderWithRelations,
} from './purchase-order.types.js';

import { PurchaseOrderService } from './purchase-order.service.js';

@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  create(
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.createFromQuotation(dto);
  }

  @Get()
  findAll(): Promise<PurchaseOrderWithRelations[]> {
    return this.purchaseOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.approve(id);
  }

  @Patch(':id/send')
  markSent(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.markSent(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.cancel(id);
  }
}
