import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

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

  @Post()
  create(
    @Body() dto: CreatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.create(dto);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status')
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ): Promise<PurchaseRequestWithRelations[]> {
    return this.purchaseRequestService.findAll(branchId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    return this.purchaseRequestService.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.submit(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.reject(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<PurchaseRequestRecord> {
    return this.purchaseRequestService.cancel(id);
  }
}
