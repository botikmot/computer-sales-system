import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto.js';
import { SupplierPaymentService } from './supplier-payment.service.js';

@Controller('supplier-payments')
export class SupplierPaymentController {
  constructor(
    private readonly supplierPaymentService: SupplierPaymentService,
  ) {}

  @Post()
  create(@Body() dto: CreateSupplierPaymentDto) {
    return this.supplierPaymentService.create(dto);
  }

  @Get()
  findAll() {
    return this.supplierPaymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierPaymentService.findOne(id);
  }
}
