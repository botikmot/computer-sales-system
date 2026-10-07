import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto.js';

import { PurchaseInvoiceService } from './purchase-invoice.service.js';

import { PurchaseInvoiceQueryDto } from './dto/purchase-invoice-query.dto.js';

import type {
  PurchaseInvoiceListResponse,
  PurchaseInvoiceWithRelations,
} from './purchase-invoice.types.js';

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
    @Query() query: PurchaseInvoiceQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseInvoiceListResponse> {
    return this.purchaseInvoiceService.findAll(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get('awaiting-receivings')
  findAwaitingReceivings(
    @Query() query: PurchaseInvoiceQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseInvoiceService.findAwaitingReceivings(query, user);
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
