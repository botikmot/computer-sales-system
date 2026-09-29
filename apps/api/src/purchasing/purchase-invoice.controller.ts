import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

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
  ): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(): Promise<PurchaseInvoiceWithRelations[]> {
    return this.purchaseInvoiceService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.findOne(id);
  }
}
