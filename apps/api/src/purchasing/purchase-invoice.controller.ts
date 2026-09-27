import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto.js';

import type { PurchaseInvoiceWithRelations } from './purchase-invoice.types.js';

import { PurchaseInvoiceService } from './purchase-invoice.service.js';

@Controller('purchase-invoices')
export class PurchaseInvoiceController {
  constructor(
    private readonly purchaseInvoiceService: PurchaseInvoiceService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePurchaseInvoiceDto,
  ): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.create(dto);
  }

  @Get()
  findAll(): Promise<PurchaseInvoiceWithRelations[]> {
    return this.purchaseInvoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseInvoiceWithRelations> {
    return this.purchaseInvoiceService.findOne(id);
  }
}
