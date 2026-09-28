import { Controller, Get, Query } from '@nestjs/common';

import { ReportsService } from './reports.service.js';
import { PettyCashReportQueryDto } from './dto/petty-cash-report-query.dto.js';

@Controller('reports/petty-cash')
export class PettyCashReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('transactions')
  transactions(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashTransactions(query);
  }

  @Get('vouchers')
  vouchers(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashVouchers(query);
  }

  @Get('replenishments')
  replenishments(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashReplenishments(query);
  }

  @Get('balance')
  balance(@Query() query: PettyCashReportQueryDto) {
    return this.reportsService.pettyCashBalance(query);
  }
}
