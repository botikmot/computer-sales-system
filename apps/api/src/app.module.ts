import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { PurchasingModule } from './purchasing/purchasing.module.js';
import { SalesModule } from './sales/sales.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { InventoryAdjustmentModule } from './inventory-adjustment/inventory-adjustment.module.js';
import { ServiceRepairModule } from './service-repair/service-repair.module.js';
import { CashBankModule } from './cash-bank/cash-bank.module.js';
import { PettyCashModule } from './petty-cash/petty-cash.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    PurchasingModule,
    SalesModule,
    CustomersModule,
    InventoryAdjustmentModule,
    ServiceRepairModule,
    CashBankModule,
    PettyCashModule,
    ReportsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
