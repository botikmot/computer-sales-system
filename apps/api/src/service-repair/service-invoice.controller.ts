import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto.js';

import { ServiceInvoiceService } from './service-invoice.service.js';

@Controller('service-repair/invoices')
export class ServiceInvoiceController {
  constructor(private readonly serviceInvoiceService: ServiceInvoiceService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post('from-job/:serviceJobId')
  createFromJob(
    @Param('serviceJobId', new ParseUUIDPipe())
    serviceJobId: string,
    @Body() dto: CreateServiceInvoiceDto,
  ) {
    return this.serviceInvoiceService.createFromServiceJob(serviceJobId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get()
  findAll() {
    return this.serviceInvoiceService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.CASHIER)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceInvoiceService.findOne(id);
  }
}
