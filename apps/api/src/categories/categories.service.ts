import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();

    const existing = await this.prisma.productCategory.findUnique({
      where: {
        name,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Category name already exists.');
    }

    try {
      return await this.prisma.productCategory.create({
        data: {
          name,
          isActive: dto.isActive ?? true,
        },
      });
    } catch {
      throw new ConflictException('Unable to create category.');
    }
  }

  async findAll() {
    return this.prisma.productCategory.findMany({
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
    const category = await this.prisma.productCategory.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findOne(id);

    const nextName = dto.name !== undefined ? dto.name.trim() : existing.name;

    if (!nextName) {
      throw new ConflictException('Category name cannot be empty.');
    }

    if (nextName !== existing.name) {
      const duplicate = await this.prisma.productCategory.findUnique({
        where: {
          name: nextName,
        },
        select: {
          id: true,
        },
      });

      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictException('Category name already exists.');
      }
    }

    try {
      return await this.prisma.productCategory.update({
        where: {
          id: existing.id,
        },

        data: {
          ...(dto.name !== undefined
            ? {
                name: nextName,
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
      throw new ConflictException('Unable to update category.');
    }
  }
}
