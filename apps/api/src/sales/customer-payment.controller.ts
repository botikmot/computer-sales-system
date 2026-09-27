import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto.js';
import { CustomerPaymentService } from './customer-payment.service.js';

@Controller('sales/customer-payments')
export class CustomerPaymentController {
  constructor(
    private readonly customerPaymentService: CustomerPaymentService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateCustomerPaymentDto,
  ) {
    return this.customerPaymentService.create(dto);
  }

  @Get()
  findAll() {
    return this.customerPaymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerPaymentService.findOne(id);
  }
}
