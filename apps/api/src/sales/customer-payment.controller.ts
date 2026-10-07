import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto.js';

import { CustomerPaymentService } from './customer-payment.service.js';

import { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Controller('sales/customer-payments')
export class CustomerPaymentController {
  constructor(
    private readonly customerPaymentService: CustomerPaymentService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Post()
  create(
    @Body() dto: CreateCustomerPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customerPaymentService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll(
    @Query() query: SalesListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customerPaymentService.findAll(user, query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customerPaymentService.findOne(id, user);
  }
}
