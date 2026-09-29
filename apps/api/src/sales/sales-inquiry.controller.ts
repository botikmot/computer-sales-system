import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto.js';

import { SalesInquiryService } from './sales-inquiry.service.js';

@Controller('sales/inquiries')
export class SalesInquiryController {
  constructor(private readonly salesInquiryService: SalesInquiryService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(
    @Body() dto: CreateSalesInquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesInquiryService.create(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.salesInquiryService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesInquiryService.findOne(id, user);
  }
}
