import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto.js';
import { SalesQuotationService } from './sales-quotation.service.js';

@Controller('sales/quotations')
export class SalesQuotationController {
  constructor(private readonly salesQuotationService: SalesQuotationService) {}

  @Post()
  create(@Body() dto: CreateSalesQuotationDto) {
    return this.salesQuotationService.create(dto);
  }

  @Get()
  findAll() {
    return this.salesQuotationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesQuotationService.findOne(id);
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.salesQuotationService.send(id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.salesQuotationService.accept(id);
  }
}
