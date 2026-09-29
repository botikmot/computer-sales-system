import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

import { UpdateUserBranchDto } from './dto/update-user-branch.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

import { UsersService } from './users.service.js';

type CurrentAuthenticatedUser = {
  id: string;
  role: UserRole;
};

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser()
    currentUser: CurrentAuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto, currentUser.id);
  }

  @Patch(':id/branch')
  updateBranch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserBranchDto,
  ) {
    return this.usersService.updateBranch(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser()
    currentUser: CurrentAuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto, currentUser.id);
  }
}
