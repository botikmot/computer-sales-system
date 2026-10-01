import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { InventoryAdjustmentService } from './inventory-adjustment.service.js';

import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CountInventoryAdjustmentDto } from './dto/count-inventory-adjustment.dto.js';
import { RejectInventoryAdjustmentDto } from './dto/reject-inventory-adjustment.dto.js';
import { InventoryAdjustmentQueryDto } from './dto/inventory-adjustment-query.dto.js';

@Controller('inventory-adjustments')
export class InventoryAdjustmentController {
  constructor(
    private readonly inventoryAdjustmentService: InventoryAdjustmentService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post()
  create(
    @Body() dto: CreateInventoryAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get()
  findAll(
    @Query() query: InventoryAdjustmentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.findAll(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/count')
  count(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CountInventoryAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.count(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/confirm')
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.confirm(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/submit')
  submitForApproval(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.submitForApproval(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/approve')
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.approve(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectInventoryAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.reject(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/post')
  post(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.post(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/cancel')
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryAdjustmentService.cancel(id, user);
  }
}
