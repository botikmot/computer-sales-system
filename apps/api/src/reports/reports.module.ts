import { Module } from '@nestjs/common';

import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { PettyCashReportsController } from './petty-cash-reports.controller.js';
import { AccountsReceivableReportsController } from './accounts-receivable-reports.controller.js';
import { AccountsPayableReportsController } from './accounts-payable-reports.controller.js';
import { SalesReportsController } from './sales-reports.controller.js';

@Module({
  controllers: [
    ReportsController,
    PettyCashReportsController,
    AccountsReceivableReportsController,
    AccountsPayableReportsController,
    SalesReportsController,
  ],
  providers: [ReportsService],
})
export class ReportsModule {}
