import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { ReportsService } from './reports.service.js';

import { PettyCashReportQueryDto } from './dto/petty-cash-report-query.dto.js';

@Controller('reports/petty-cash')
export class PettyCashReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('transactions')
  transactions(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashTransactions(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('vouchers')
  vouchers(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashVouchers(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('replenishments')
  replenishments(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashReplenishments(query);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Get('balance')
  balance(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashBalance(query);
  }
}
