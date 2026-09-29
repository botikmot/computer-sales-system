import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto.js';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import type {
  PurchaseRequestRecord,
  PurchaseRequestWithRelations,
} from './purchase-request.types.js';

@Controller('purchase-requests')
export class PurchaseRequestController {
  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post()
  create(
    @Body() dto: CreatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status')
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ): Promise<PurchaseRequestWithRelations[]> {
    return this.purchaseRequestService.findAll(branchId, status);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/submit')
  submit(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.submit(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/approve')
  approve(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.approve(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/reject')
  reject(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.reject(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.cancel(id);
  }
}
