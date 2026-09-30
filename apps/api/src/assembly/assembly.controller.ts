import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { AssemblyService } from './assembly.service.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { CreateAssemblyDto } from './dto/create-assembly.dto.js';

@Controller('assemblies')
export class AssemblyController {
  constructor(private readonly assemblyService: AssemblyService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post('bom')
  createBom(@Body() dto: CreateBomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assemblyService.createBom(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assemblyService.findAll(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assemblyService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Post()
  createAssembly(
    @Body() dto: CreateAssemblyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assemblyService.createAssembly(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY)
  @Get('bom/:id')
  findBom(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assemblyService.findBom(id, user);
  }
}
