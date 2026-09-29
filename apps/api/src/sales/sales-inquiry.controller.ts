import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto.js';

import { SalesInquiryService } from './sales-inquiry.service.js';

@Controller('sales/inquiries')
export class SalesInquiryController {
  constructor(private readonly salesInquiryService: SalesInquiryService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(@Body() dto: CreateSalesInquiryDto) {
    return this.salesInquiryService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get()
  findAll() {
    return this.salesInquiryService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInquiryService.findOne(id);
  }
}
