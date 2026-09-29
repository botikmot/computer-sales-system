import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateReceivingDto } from './dto/create-receiving.dto.js';
import { VerifyReceivingDto } from './dto/verify-receiving.dto.js';

import type { ReceivingWithRelations } from './receiving.types.js';

import { ReceivingService } from './receiving.service.js';

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
  create(@Body() dto: CreateReceivingDto): Promise<ReceivingWithRelations> {
    return this.receivingService.create(dto);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PURCHASING,
    UserRole.INVENTORY,
  )
  @Get()
  findAll(): Promise<ReceivingWithRelations[]> {
    return this.receivingService.findAll();
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PURCHASING,
    UserRole.INVENTORY,
  )
  @Get(':id')
  findOne(@Param('id') id: string): Promise<ReceivingWithRelations> {
    return this.receivingService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyReceivingDto,
  ): Promise<ReceivingWithRelations> {
    return this.receivingService.verify(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post(':id/post')
  post(@Param('id') id: string): Promise<ReceivingWithRelations> {
    return this.receivingService.post(id);
  }
}
