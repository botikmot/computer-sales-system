import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CreateSupplierQuotationDto } from './dto/create-supplier-quotation.dto.js';

import type {
  SupplierQuotationRecord,
  SupplierQuotationWithRelations,
} from './supplier-quotation.types.js';

import { SupplierQuotationService } from './supplier-quotation.service.js';

@Controller('supplier-quotations')
export class SupplierQuotationController {
  constructor(
    private readonly supplierQuotationService: SupplierQuotationService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateSupplierQuotationDto,
  ): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.create(dto);
  }

  @Get()
  findAll(
    @Query('purchaseRequestId')
    purchaseRequestId?: string,
  ): Promise<SupplierQuotationWithRelations[]> {
    return this.supplierQuotationService.findAll(purchaseRequestId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.findOne(id);
  }

  @Post(':id/receive')
  receive(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.receive(id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.accept(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.reject(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.cancel(id);
  }
}
