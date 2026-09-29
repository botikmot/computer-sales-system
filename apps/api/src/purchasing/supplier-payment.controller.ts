import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto.js';
import { SupplierPaymentService } from './supplier-payment.service.js';

@Controller('supplier-payments')
export class SupplierPaymentController {
  constructor(
    private readonly supplierPaymentService: SupplierPaymentService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post()
  create(@Body() dto: CreateSupplierPaymentDto) {
    return this.supplierPaymentService.create(dto);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get()
  findAll() {
    return this.supplierPaymentService.findAll();
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.PURCHASING,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierPaymentService.findOne(id);
  }
}
