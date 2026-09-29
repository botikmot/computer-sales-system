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

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get()
  findAll(
    @Query('branchId') branchId: string | undefined,

    @Query('status')
    status:
      'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | undefined,

    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations[]> {
    return this.purchaseRequestService.findAll(branchId, status, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.update(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.submit(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.approve(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.reject(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING)
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.cancel(id, user);
  }
}
