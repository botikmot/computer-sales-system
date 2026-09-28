import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto.js';
import { ServiceInvoiceService } from './service-invoice.service.js';

@Controller('service-repair/invoices')
export class ServiceInvoiceController {
  constructor(private readonly serviceInvoiceService: ServiceInvoiceService) {}

  @Post('/from-job/:serviceJobId')
  createFromJob(
    @Param('serviceJobId', new ParseUUIDPipe())
    serviceJobId: string,
    @Body() dto: CreateServiceInvoiceDto,
  ) {
    return this.serviceInvoiceService.createFromServiceJob(serviceJobId, dto);
  }

  @Get()
  findAll() {
    return this.serviceInvoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceInvoiceService.findOne(id);
  }
}
