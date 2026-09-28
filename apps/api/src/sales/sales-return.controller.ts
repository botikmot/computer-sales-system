import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateSalesReturnDto } from './dto/create-sales-return.dto.js';
import { SalesReturnService } from './sales-return.service.js';

@Controller('sales/returns')
export class SalesReturnController {
  constructor(private readonly salesReturnService: SalesReturnService) {}

  @Post()
  create(@Body() dto: CreateSalesReturnDto) {
    return this.salesReturnService.create(dto);
  }

  @Get()
  findAll() {
    return this.salesReturnService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesReturnService.findOne(id);
  }
}
