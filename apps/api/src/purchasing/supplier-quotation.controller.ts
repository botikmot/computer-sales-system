import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSupplierQuotationDto } from './dto/create-supplier-quotation.dto.js';
import { SupplierQuotationQueryDto } from './dto/supplier-quotation-query.dto.js';
import type { PurchaseRequestListResponse } from './purchase-request.types.js';

import type {
  SupplierQuotationRecord,
  SupplierQuotationWithRelations,
  SupplierQuotationListResponse,
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @Query() query: SupplierQuotationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationListResponse> {
    return this.supplierQuotationService.findAll(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('awaiting-purchase-requests')
  findAwaitingPurchaseRequests(
    @Query() query: SupplierQuotationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestListResponse> {
    return this.supplierQuotationService.findAwaitingPurchaseRequests(
      query,
      user,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationWithRelations> {
    return this.supplierQuotationService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/receive')
  receive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.receive(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.accept(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.reject(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    return this.supplierQuotationService.cancel(id, user);
  }
}
