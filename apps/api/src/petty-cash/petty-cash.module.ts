import { Module } from '@nestjs/common';

import { PettyCashController } from './petty-cash.controller.js';
import { PettyCashService } from './petty-cash.service.js';

@Module({
  controllers: [PettyCashController],
  providers: [PettyCashService],
})
export class PettyCashModule {}
