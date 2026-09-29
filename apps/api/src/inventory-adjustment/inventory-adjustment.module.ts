import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';

import { InventoryAdjustmentController } from './inventory-adjustment.controller.js';
import { InventoryAdjustmentService } from './inventory-adjustment.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [InventoryAdjustmentController],
  providers: [InventoryAdjustmentService],
  exports: [InventoryAdjustmentService],
})
export class InventoryAdjustmentModule {}
