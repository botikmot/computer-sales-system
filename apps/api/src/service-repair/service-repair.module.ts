import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';

import { ServiceRepairController } from './service-repair.controller.js';
import { ServiceRepairService } from './service-repair.service.js';

import { ServiceInvoiceController } from './service-invoice.controller.js';
import { ServiceInvoiceService } from './service-invoice.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ServiceRepairController, ServiceInvoiceController],
  providers: [ServiceRepairService, ServiceInvoiceService],
  exports: [ServiceRepairService, ServiceInvoiceService],
})
export class ServiceRepairModule {}
