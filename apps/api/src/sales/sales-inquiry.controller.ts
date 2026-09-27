import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto.js';
import { SalesInquiryService } from './sales-inquiry.service.js';

@Controller('sales/inquiries')
export class SalesInquiryController {
  constructor(private readonly salesInquiryService: SalesInquiryService) {}

  @Post()
  create(@Body() dto: CreateSalesInquiryDto) {
    return this.salesInquiryService.create(dto);
  }

  @Get()
  findAll() {
    return this.salesInquiryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInquiryService.findOne(id);
  }
}
