import { Module } from '@nestjs/common';

import { CashBankController } from './cash-bank.controller.js';
import { CashBankService } from './cash-bank.service.js';

@Module({
  controllers: [CashBankController],
  providers: [CashBankService],
})
export class CashBankModule {}
