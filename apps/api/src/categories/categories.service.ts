import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryQueryDto } from './dto/category-query.dto.js';
import { Prisma } from '@computer-sales/database';

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

  async findAll(query: CategoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductCategoryWhereInput = {};

    if (query.status === 'ACTIVE') {
      where.isActive = true;
    }

    if (query.status === 'INACTIVE') {
      where.isActive = false;
    }

    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const sortOrder = query.sortOrder ?? 'asc';

    const orderBy = query.sortBy
      ? {
          [query.sortBy]: sortOrder,
        }
      : {
          name: 'asc' as const,
        };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.productCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),

      this.prisma.productCategory.count({
        where,
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
    };
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
