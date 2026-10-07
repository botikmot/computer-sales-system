import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto.js';

import { ServiceInvoiceService } from './service-invoice.service.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ServiceInvoiceQueryDto } from './dto/service-invoice-query.dto.js';

@Controller('service-repair/invoices')
export class ServiceInvoiceController {
  constructor(private readonly serviceInvoiceService: ServiceInvoiceService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-job/:serviceJobId')
  createFromJob(
    @Param('serviceJobId', new ParseUUIDPipe())
    serviceJobId: string,
    @Body() dto: CreateServiceInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceInvoiceService.createFromServiceJob(
      serviceJobId,
      dto,
      user,
    );
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES,
    UserRole.CASHIER,
    UserRole.TECHNICIAN,
  )
  @Get()
  findAll(
    @Query() query: ServiceInvoiceQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceInvoiceService.findAll(query, user);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES,
    UserRole.CASHIER,
    UserRole.TECHNICIAN,
  )
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceInvoiceService.findOne(id, user);
  }
}
