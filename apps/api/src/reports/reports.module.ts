import { Module } from '@nestjs/common';

import { CashBankReportsController } from './cash-bank-reports.controller.js';
import { ReportsService } from './reports.service.js';
import { PettyCashReportsController } from './petty-cash-reports.controller.js';
import { AccountsReceivableReportsController } from './accounts-receivable-reports.controller.js';
import { AccountsPayableReportsController } from './accounts-payable-reports.controller.js';
import { SalesReportsController } from './sales-reports.controller.js';
import { ServiceReportsController } from './service-reports.controller.js';
import { ManagementReportsController } from './management-reports.controller.js';
import { PurchasingReportsController } from './purchasing-reports.controller.js';
import { InventoryReportsController } from './inventory-reports.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [
    CashBankReportsController,
    PettyCashReportsController,
    AccountsReceivableReportsController,
    AccountsPayableReportsController,
    SalesReportsController,
    ServiceReportsController,
    ManagementReportsController,
    PurchasingReportsController,
    InventoryReportsController,
  ],
  providers: [ReportsService],
})
export class ReportsModule {}
