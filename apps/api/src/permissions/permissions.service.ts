import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_REGISTRY,
  type PermissionKey,
} from './permission.registry.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensurePermissionRows(): Promise<void> {
    const roles = Object.values(UserRole);

    const data = roles.flatMap((role) =>
      PERMISSION_REGISTRY.map((permission) => ({
        role,
        permissionKey: permission.key,
        isAllowed: DEFAULT_ROLE_PERMISSIONS[role].includes(permission.key),
      })),
    );

    // Add missing defaults only. Existing saved choices are preserved.
    await this.prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });

    // Keep ADMIN from being locked out through configurable permissions.
    await this.prisma.rolePermission.updateMany({
      where: { role: UserRole.ADMIN },
      data: { isAllowed: true },
    });
  }

  async getRolePermissionMatrix() {
    await this.ensurePermissionRows();

    const roles = Object.values(UserRole);
    const rows = await this.prisma.rolePermission.findMany({
      where: {
        permissionKey: {
          in: PERMISSION_REGISTRY.map((permission) => permission.key),
        },
      },
      select: {
        role: true,
        permissionKey: true,
        isAllowed: true,
      },
    });

    const savedPermissions = new Map<string, boolean>();

    for (const row of rows) {
      savedPermissions.set(`${row.role}:${row.permissionKey}`, row.isAllowed);
    }

    return {
      permissions: PERMISSION_REGISTRY,
      roles: roles.map((role) => {
        const permissions = Object.fromEntries(
          PERMISSION_REGISTRY.map((permission) => {
            const key = permission.key as PermissionKey;
            const savedValue = savedPermissions.get(`${role}:${key}`);

            return [
              key,
              role === UserRole.ADMIN
                ? true
                : (savedValue ?? DEFAULT_ROLE_PERMISSIONS[role].includes(key)),
            ];
          }),
        ) as Record<PermissionKey, boolean>;

        return { role, permissions };
      }),
    };
  }

  async updateRolePermissions(
    role: UserRole,
    dto: UpdateRolePermissionsDto,
    updatedById: string,
  ) {
    if (role === UserRole.ADMIN) {
      throw new BadRequestException(
        'The ADMIN role permissions cannot be edited.',
      );
    }

    const validKeys = new Set(
      PERMISSION_REGISTRY.map((permission) => permission.key),
    );

    for (const item of dto.permissions) {
      if (!validKeys.has(item.permissionKey)) {
        throw new BadRequestException(
          `Unknown permission: ${item.permissionKey}`,
        );
      }
    }

    await this.ensurePermissionRows();

    if (dto.permissions.length > 0) {
      await this.prisma.$transaction(
        dto.permissions.map((item) =>
          this.prisma.rolePermission.upsert({
            where: {
              role_permissionKey: {
                role,
                permissionKey: item.permissionKey,
              },
            },
            create: {
              role,
              permissionKey: item.permissionKey,
              isAllowed: item.isAllowed,
              updatedById,
            },
            update: {
              isAllowed: item.isAllowed,
              updatedById,
            },
          }),
        ),
      );
    }

    return this.getRolePermissionMatrix();
  }

  async getPermissionsForRole(role: UserRole) {
    await this.ensurePermissionRows();

    const rows = await this.prisma.rolePermission.findMany({
      where: {
        role,
        permissionKey: {
          in: PERMISSION_REGISTRY.map((permission) => permission.key),
        },
      },
      select: {
        permissionKey: true,
        isAllowed: true,
      },
    });

    const savedPermissions = new Map(
      rows.map((row) => [row.permissionKey, row.isAllowed]),
    );

    const permissions = Object.fromEntries(
      PERMISSION_REGISTRY.map((permission) => [
        permission.key,
        role === UserRole.ADMIN
          ? true
          : (savedPermissions.get(permission.key) ??
            DEFAULT_ROLE_PERMISSIONS[role].includes(permission.key)),
      ]),
    ) as Record<PermissionKey, boolean>;

    return {
      role,
      permissions,
    };
  }
}
