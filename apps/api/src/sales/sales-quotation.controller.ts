import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto.js';

import { SalesQuotationService } from './sales-quotation.service.js';
import { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Controller('sales/quotations')
export class SalesQuotationController {
  constructor(private readonly salesQuotationService: SalesQuotationService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(
    @Body() dto: CreateSalesQuotationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesQuotationService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get()
  findAll(
    @Query() query: SalesListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesQuotationService.findAll(user, query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesQuotationService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/send')
  send(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesQuotationService.send(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesQuotationService.accept(id, user);
  }
}
