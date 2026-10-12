import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@computer-sales/database';

import { PrismaService } from '../../database/prisma.service.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PERMISSION_KEY } from '../decorators/permission.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      targets,
    );

    const permission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      targets,
    );

    // Important: endpoints without role/permission metadata
    // must retain the original RolesGuard behavior.
    if (!permission && (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (permission) {
      // Prevent configurable permissions from locking out ADMIN.
      if (user.role === UserRole.ADMIN) {
        return true;
      }

      const rolePermission = await this.prisma.rolePermission.findUnique({
        where: {
          role_permissionKey: {
            role: user.role,
            permissionKey: permission,
          },
        },
      });

      if (rolePermission) {
        return rolePermission.isAllowed;
      }

      // Preserve existing role restrictions when no permission
      // record exists yet.
      return Boolean(requiredRoles?.includes(user.role));
    }

    return requiredRoles!.includes(user.role);
  }
}
