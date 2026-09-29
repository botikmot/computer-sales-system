import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();

    const existing = await this.prisma.branch.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Branch code already exists.');
    }

    try {
      return await this.prisma.branch.create({
        data: {
          code,
          name,
          address: dto.address?.trim() || null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch {
      throw new ConflictException('Unable to create branch.');
    }
  }

  async findAll() {
    return this.prisma.branch.findMany({
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: {
        id,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.findOne(id);

    const nextCode =
      dto.code !== undefined ? dto.code.trim().toUpperCase() : existing.code;

    const nextName = dto.name !== undefined ? dto.name.trim() : existing.name;

    if (!nextCode) {
      throw new BadRequestException('Branch code cannot be empty.');
    }

    if (!nextName) {
      throw new BadRequestException('Branch name cannot be empty.');
    }

    if (nextCode !== existing.code) {
      const codeConflict = await this.prisma.branch.findUnique({
        where: {
          code: nextCode,
        },
        select: {
          id: true,
        },
      });

      if (codeConflict && codeConflict.id !== existing.id) {
        throw new ConflictException('Branch code already exists.');
      }
    }

    /*
     * Do not deactivate a branch while active users
     * are still assigned to it.
     *
     * This prevents active users from being left on an
     * inactive branch because branch assignment already
     * rejects inactive branches.
     */
    if (dto.isActive === false && existing.isActive === true) {
      const activeUsers = await this.prisma.user.count({
        where: {
          branchId: existing.id,
          status: 'ACTIVE',
        },
      });

      if (activeUsers > 0) {
        throw new BadRequestException(
          `Cannot deactivate branch while ${activeUsers} active user(s) are assigned to it.`,
        );
      }
    }

    try {
      return await this.prisma.branch.update({
        where: {
          id: existing.id,
        },

        data: {
          code: nextCode,
          name: nextName,

          ...(dto.address !== undefined
            ? {
                address: dto.address.trim() || null,
              }
            : {}),

          ...(dto.phone !== undefined
            ? {
                phone: dto.phone.trim() || null,
              }
            : {}),

          ...(dto.email !== undefined
            ? {
                email: dto.email.trim().toLowerCase() || null,
              }
            : {}),

          ...(dto.isActive !== undefined
            ? {
                isActive: dto.isActive,
              }
            : {}),
        },
      });
    } catch {
      throw new ConflictException('Unable to update branch.');
    }
  }
}
