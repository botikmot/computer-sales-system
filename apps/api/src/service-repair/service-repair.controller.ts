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

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@Controller('service-repair/jobs')
export class ServiceRepairController {
  constructor(private readonly serviceRepairService: ServiceRepairService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(
    @Body() dto: CreateServiceJobDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.serviceRepairService.create(dto, currentUser);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.TECHNICIAN)
  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.serviceRepairService.findAll(currentUser);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.TECHNICIAN)
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.serviceRepairService.findOne(id, currentUser);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/diagnose')
  diagnose(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DiagnoseServiceJobDto,
  ) {
    return this.serviceRepairService.diagnose(id, dto, user);
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
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddServiceJobPartDto,
  ) {
    return this.serviceRepairService.addPart(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post(':id/approve')
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceRepairService.approve(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/start')
  start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceRepairService.start(id, user);
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
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IssueServicePartsDto,
  ) {
    return this.serviceRepairService.issueParts(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Post(':id/complete')
  complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceRepairService.complete(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/cancel')
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.serviceRepairService.cancel(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch(':id/technician')
  assignTechnician(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignServiceTechnicianDto,
  ) {
    return this.serviceRepairService.assignTechnician(
      id,
      dto.technicianId,
      user,
    );
  }
}
