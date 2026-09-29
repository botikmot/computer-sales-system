import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto.js';

import { SalesQuotationService } from './sales-quotation.service.js';

@Controller('sales/quotations')
export class SalesQuotationController {
  constructor(private readonly salesQuotationService: SalesQuotationService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(@Body() dto: CreateSalesQuotationDto) {
    return this.salesQuotationService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get()
  findAll() {
    return this.salesQuotationService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesQuotationService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.salesQuotationService.send(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.salesQuotationService.accept(id);
  }
}
