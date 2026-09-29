import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto.js';

import type { PurchaseInvoiceWithRelations } from './purchase-invoice.types.js';

import { PurchaseInvoiceService } from './purchase-invoice.service.js';

@Controller('purchase-invoices')
export class PurchaseInvoiceController {
  constructor(
    private readonly purchaseInvoiceService: PurchaseInvoiceService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreatePurchaseInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceWithRelations[]> {
    return this.purchaseInvoiceService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.findOne(id, user);
  }
}
