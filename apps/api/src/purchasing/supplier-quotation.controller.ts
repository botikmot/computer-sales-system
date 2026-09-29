import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

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

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreateSupplierQuotationDto,
  ): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @Query('purchaseRequestId')
    purchaseRequestId?: string,
  ): Promise<SupplierQuotationWithRelations[]> {
    return this.supplierQuotationService.findAll(purchaseRequestId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/receive')
  receive(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.receive(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/accept')
  accept(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.accept(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/reject')
  reject(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.reject(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.cancel(id);
  }
}
