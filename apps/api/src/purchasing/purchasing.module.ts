import { Module } from '@nestjs/common';

import { PurchaseRequestController } from './purchase-request.controller.js';
import { PurchaseRequestService } from './purchase-request.service.js';

@Module({
  controllers: [PurchaseRequestController],
  providers: [PurchaseRequestService],
})
export class PurchasingModule {}
