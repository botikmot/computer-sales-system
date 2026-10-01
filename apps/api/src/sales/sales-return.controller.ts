import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSalesReturnDto } from './dto/create-sales-return.dto.js';

import { SalesReturnService } from './sales-return.service.js';

import { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Controller('sales/returns')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(
    @Body() dto: CreateSalesReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesReturnService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll(
    @Query() query: SalesListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesReturnService.findAll(user, query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesReturnService.findOne(id, user);
  }
}
