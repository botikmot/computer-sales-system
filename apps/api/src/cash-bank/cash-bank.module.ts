import { Module } from '@nestjs/common';

import { CashBankController } from './cash-bank.controller.js';
import { CashBankService } from './cash-bank.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [CashBankController],
  providers: [CashBankService],
})
export class CashBankModule {}
