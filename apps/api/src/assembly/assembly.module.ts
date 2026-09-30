import { Module } from '@nestjs/common';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import { AssemblyController } from './assembly.controller.js';
import { AssemblyService } from './assembly.service.js';

@Module({
  controllers: [AssemblyController],
  providers: [AssemblyService, PrismaService, BranchAccessService],
  exports: [AssemblyService],
})
export class AssemblyModule {}
