import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.createFromQuotation(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderWithRelations[]> {
    return this.purchaseOrderService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderWithRelations> {
    return this.purchaseOrderService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.approve(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id/send')
  markSent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.markSent(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseOrderRecord> {
    return this.purchaseOrderService.cancel(id, user);
  }
}
