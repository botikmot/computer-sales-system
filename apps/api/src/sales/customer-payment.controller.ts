import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto.js';

import { CustomerPaymentService } from './customer-payment.service.js';

@Controller('sales/customer-payments')
export class CustomerPaymentController {
  constructor(
    private readonly customerPaymentService: CustomerPaymentService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post()
  create(
    @Body()
    dto: CreateCustomerPaymentDto,
  ) {
    return this.customerPaymentService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get()
  findAll() {
    return this.customerPaymentService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerPaymentService.findOne(id);
  }
}
