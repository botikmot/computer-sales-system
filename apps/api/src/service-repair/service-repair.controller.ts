import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
} from '@nestjs/common';

import { AddServiceJobPartDto } from './dto/add-service-job-part.dto.js';
import { CreateServiceJobDto } from './dto/create-service-job.dto.js';
import { DiagnoseServiceJobDto } from './dto/diagnose-service-job.dto.js';
import { IssueServicePartsDto } from './dto/issue-service-parts.dto.js';
import { AssignServiceTechnicianDto } from './dto/assign-service-technician.dto.js';

import { ServiceRepairService } from './service-repair.service.js';

@Controller('service-repair/jobs')
export class ServiceRepairController {
  constructor(private readonly serviceRepairService: ServiceRepairService) {}

  @Post()
  create(@Body() dto: CreateServiceJobDto) {
    return this.serviceRepairService.create(dto);
  }

  @Get()
  findAll() {
    return this.serviceRepairService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.findOne(id);
  }

  @Post(':id/diagnose')
  diagnose(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DiagnoseServiceJobDto,
  ) {
    return this.serviceRepairService.diagnose(id, dto);
  }

  @Post(':id/parts')
  addPart(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddServiceJobPartDto,
  ) {
    return this.serviceRepairService.addPart(id, dto);
  }

  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.approve(id);
  }

  @Post(':id/start')
  start(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.start(id);
  }

  @Post(':id/issue-parts')
  issueParts(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: IssueServicePartsDto,
  ) {
    return this.serviceRepairService.issueParts(id, dto);
  }

  @Post(':id/complete')
  complete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.cancel(id);
  }

  @Patch(':id/technician')
  assignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignServiceTechnicianDto,
  ) {
    return this.serviceRepairService.assignTechnician(id, dto.technicianId);
  }
}
