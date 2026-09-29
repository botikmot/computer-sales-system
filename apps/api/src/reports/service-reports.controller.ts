import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';

@Controller('reports/service')
export class ServiceReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('open-jobs')
  openJobs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.openServiceJobs(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('completed-repairs')
  completedRepairs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.completedRepairs(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('pending-repairs')
  pendingRepairs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.pendingRepairs(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('parts-used')
  partsUsed(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.servicePartsUsed(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('revenue')
  serviceRevenue(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.serviceRevenue(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('technician-performance')
  technicianPerformance(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.technicianPerformance(query);
  }
}
