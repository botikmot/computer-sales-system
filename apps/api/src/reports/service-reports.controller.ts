import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';

@Controller('reports/service')
export class ServiceReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('open-jobs')
  openJobs(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.openServiceJobs(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('completed-repairs')
  completedRepairs(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.completedRepairs(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('pending-repairs')
  pendingRepairs(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.pendingRepairs(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('parts-used')
  partsUsed(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.servicePartsUsed(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('revenue')
  serviceRevenue(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.serviceRevenue(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('technician-performance')
  technicianPerformance(
    @Query() query: ServiceReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.technicianPerformance(query, user);
  }
}
