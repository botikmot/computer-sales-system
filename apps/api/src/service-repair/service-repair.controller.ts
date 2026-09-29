import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { AddServiceJobPartDto } from './dto/add-service-job-part.dto.js';
import { CreateServiceJobDto } from './dto/create-service-job.dto.js';
import { DiagnoseServiceJobDto } from './dto/diagnose-service-job.dto.js';
import { IssueServicePartsDto } from './dto/issue-service-parts.dto.js';
import { AssignServiceTechnicianDto } from './dto/assign-service-technician.dto.js';

import { ServiceRepairService } from './service-repair.service.js';

@Controller('service-repair/jobs')
export class ServiceRepairController {
  constructor(private readonly serviceRepairService: ServiceRepairService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(@Body() dto: CreateServiceJobDto) {
    return this.serviceRepairService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.TECHNICIAN)
  @Get()
  findAll() {
    return this.serviceRepairService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.TECHNICIAN)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/diagnose')
  diagnose(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DiagnoseServiceJobDto,
  ) {
    return this.serviceRepairService.diagnose(id, dto);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TECHNICIAN,
    UserRole.INVENTORY,
  )
  @Post(':id/parts')
  addPart(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddServiceJobPartDto,
  ) {
    return this.serviceRepairService.addPart(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.approve(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/start')
  start(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.start(id);
  }

  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TECHNICIAN,
    UserRole.INVENTORY,
  )
  @Post(':id/issue-parts')
  issueParts(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: IssueServicePartsDto,
  ) {
    return this.serviceRepairService.issueParts(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/complete')
  complete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.complete(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceRepairService.cancel(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id/technician')
  assignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignServiceTechnicianDto,
  ) {
    return this.serviceRepairService.assignTechnician(id, dto.technicianId);
  }
}
