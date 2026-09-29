import { Controller, Get, Query } from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { ReportsService } from './reports.service.js';

import { SalesReportQueryDto } from './dto/sales-report-query.dto.js';

@Controller('reports/sales')
export class SalesReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('daily')
  dailySales(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.dailySales(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('monthly')
  monthlySales(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.monthlySales(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-customer')
  salesByCustomer(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.salesByCustomer(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-product')
  salesByProduct(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.salesByProduct(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('by-salesperson')
  salesBySalesperson(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.salesBySalesperson(query, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Get('returns')
  salesReturns(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.salesReturns(query, user);
  }
}
