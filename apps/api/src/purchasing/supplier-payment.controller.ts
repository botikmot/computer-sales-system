import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto.js';

import { SupplierPaymentService } from './supplier-payment.service.js';

import { SupplierPaymentQueryDto } from './dto/supplier-payment-query.dto.js';

@Controller('supplier-payments')
export class SupplierPaymentController {
  constructor(
    private readonly supplierPaymentService: SupplierPaymentService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post()
  create(
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierPaymentService.create(dto, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get()
  findAll(
    @Query() query: SupplierPaymentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierPaymentService.findAll(query, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supplierPaymentService.findOne(id, user);
  }
}
