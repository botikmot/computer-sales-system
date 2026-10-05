import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole, UserStatus } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

import { UpdateUserBranchDto } from './dto/update-user-branch.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

import { GetUsersQueryDto } from './dto/get-users-query.dto.js';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const username = dto.username.trim();
    const email = dto.email?.trim().toLowerCase() || null;
    const fullName = dto.fullName.trim();
    const branchId = dto.branchId ?? null;

    if (!username) {
      throw new BadRequestException('Username is required.');
    }

    if (!fullName) {
      throw new BadRequestException('Full name is required.');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists.');
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists.');
      }
    }

    if (dto.role !== UserRole.ADMIN && !branchId) {
      throw new BadRequestException(
        'Non-admin users must be assigned to a branch.',
      );
    }

    if (branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
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

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash,
        role: dto.role,
        status: UserStatus.ACTIVE,
        branchId,
      },
    });

    return this.findOne(user.id);
  }

  async findAll(query: GetUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() || undefined;
    const role = query.role;
    const status = query.status;
    const branchId = query.branchId;

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(branchId ? { branchId } : {}),
      ...(search
        ? {
            OR: [
              {
                username: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                fullName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = {
      [sortBy]: sortOrder,
    } as Prisma.UserOrderByWithRelationInput;

    const activeWhere: Prisma.UserWhereInput = {
      ...where,
      status: UserStatus.ACTIVE,
    };

    const inactiveWhere: Prisma.UserWhereInput = {
      ...where,
      status: UserStatus.INACTIVE,
    };

    const [items, total, active, inactive] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy,

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
      }),

      this.prisma.user.count({
        where,
      }),

      this.prisma.user.count({
        where: activeWhere,
      }),

      this.prisma.user.count({
        where: inactiveWhere,
      }),
    ]);

    return {
      items,

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },

      summary: {
        total,
        active,
        inactive,
      },
    };
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
