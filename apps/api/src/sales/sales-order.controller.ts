import { Controller, Get, Param, Post, Body } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { SalesOrderService } from './sales-order.service.js';
import { ReleaseSalesOrderDto } from './dto/release-sales-order.dto.js';

@Controller('sales/orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-quotation/:quotationId')
  createFromQuotation(
    @Param('quotationId') quotationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrderService.createFromQuotation(quotationId, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.salesOrderService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesOrderService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseSalesOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesOrderService.release(id, dto, user);
  }
}
