import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';

import { InventoryAdjustmentController } from './inventory-adjustment.controller.js';
import { InventoryAdjustmentService } from './inventory-adjustment.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryAdjustmentController],
  providers: [InventoryAdjustmentService],
  exports: [InventoryAdjustmentService],
})
export class InventoryAdjustmentModule {}
