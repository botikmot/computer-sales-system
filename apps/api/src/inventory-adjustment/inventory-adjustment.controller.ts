import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { InventoryAdjustmentService } from './inventory-adjustment.service.js';

import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CountInventoryAdjustmentDto } from './dto/count-inventory-adjustment.dto.js';
import { RejectInventoryAdjustmentDto } from './dto/reject-inventory-adjustment.dto.js';

@Controller('inventory-adjustments')
export class InventoryAdjustmentController {
  constructor(
    private readonly inventoryAdjustmentService: InventoryAdjustmentService,
  ) {}

  @Post()
  create(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryAdjustmentService.create(dto);
  }

  @Get()
  findAll() {
    return this.inventoryAdjustmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.findOne(id);
  }

  @Post(':id/count')
  count(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CountInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentService.count(id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.confirm(id);
  }

  @Post(':id/submit')
  submitForApproval(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.submitForApproval(id);
  }

  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.approve(id);
  }

  @Post(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentService.reject(id, dto);
  }

  @Post(':id/post')
  post(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.post(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryAdjustmentService.cancel(id);
  }
}
