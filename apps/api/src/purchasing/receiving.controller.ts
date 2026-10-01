import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateReceivingDto } from './dto/create-receiving.dto.js';
import { VerifyReceivingDto } from './dto/verify-receiving.dto.js';

import type { ReceivingWithRelations } from './receiving.types.js';

import { ReceivingService } from './receiving.service.js';
import { ReceivingQueryDto } from './dto/receiving-query.dto.js';

@Controller('receivings')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PURCHASING,
    UserRole.INVENTORY,
  )
  @Post()
  create(
    @Body() dto: CreateReceivingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.create(dto, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PURCHASING,
    UserRole.INVENTORY,
  )
  @Get()
  findAll(
    @Query() query: ReceivingQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receivingService.findAll(query, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PURCHASING,
    UserRole.INVENTORY,
  )
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyReceivingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.verify(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/post')
  post(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.post(id, user);
  }
}
