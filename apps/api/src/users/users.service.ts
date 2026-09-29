import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole, UserStatus } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

import { UpdateUserBranchDto } from './dto/update-user-branch.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        branchId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.id === currentUserId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    if (user.role === dto.role) {
      return this.findOne(id);
    }

    if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last active administrator.',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id,
      },

      data: {
        role: dto.role,
      },

      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updateBranch(id: string, dto: UpdateUserBranchDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        branchId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const nextBranchId =
      dto.branchId !== undefined ? dto.branchId : user.branchId;

    if (nextBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: {
          id: nextBranchId,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (!branch) {
        throw new NotFoundException('Branch not found.');
      }

      if (!branch.isActive) {
        throw new BadRequestException(
          'Cannot assign user to an inactive branch.',
        );
      }
    }

    if (nextBranchId === null && user.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Non-admin users must be assigned to a branch.',
      );
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        branchId: nextBranchId,
      },

      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.id === currentUserId) {
      throw new ForbiddenException(
        'You cannot change your own account status.',
      );
    }

    if (user.status === dto.status) {
      return this.findOne(id);
    }

    if (
      user.role === UserRole.ADMIN &&
      user.status === UserStatus.ACTIVE &&
      dto.status === UserStatus.INACTIVE
    ) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active administrator.',
        );
      }
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        status: dto.status,
      },

      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
