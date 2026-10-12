import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { UserRole } from '@computer-sales/database';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { PermissionsService } from './permissions.service.js';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Every authenticated user can read their own permissions.
  @Get('me')
  getMyPermissions(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.permissionsService.getPermissionsForRole(user.role);
  }

  // Admin-only: read the complete role matrix.
  @Get('roles')
  @Roles(UserRole.ADMIN)
  getRolePermissions() {
    return this.permissionsService.getRolePermissionMatrix();
  }

  // Admin-only: update another role's permissions.
  @Patch('roles/:role')
  @Roles(UserRole.ADMIN)
  updateRolePermissions(
    @Param('role') roleParam: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: { id: string },
  ) {
    const role = Object.values(UserRole).find((value) => value === roleParam);

    if (!role) {
      throw new BadRequestException('Invalid user role.');
    }

    return this.permissionsService.updateRolePermissions(role, dto, user.id);
  }
}
