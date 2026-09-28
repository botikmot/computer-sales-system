import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';

@Controller('reports/service')
export class ServiceReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('open-jobs')
  openJobs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.openServiceJobs(query);
  }

  @Get('completed-repairs')
  completedRepairs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.completedRepairs(query);
  }

  @Get('pending-repairs')
  pendingRepairs(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.pendingRepairs(query);
  }

  @Get('parts-used')
  partsUsed(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.servicePartsUsed(query);
  }

  @Get('revenue')
  serviceRevenue(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.serviceRevenue(query);
  }

  @Get('technician-performance')
  technicianPerformance(@Query() query: ServiceReportQueryDto) {
    return this.reportsService.technicianPerformance(query);
  }
}
