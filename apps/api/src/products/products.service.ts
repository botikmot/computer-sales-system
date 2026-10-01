import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSku(value: string): string {
    return value.trim().toUpperCase();
  }

  private normalizeText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized === '' ? null : normalized;
  }

  private async validateCategory(
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.productCategory.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('Product category not found.');
    }

    if (!category.isActive) {
      throw new ConflictException(
        'Cannot assign an inactive product category.',
      );
    }
  }

  async create(dto: CreateProductDto) {
    const sku = this.normalizeSku(dto.sku);

    const existingProduct = await this.prisma.product.findUnique({
      where: {
        sku,
      },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU "${sku}" already exists.`);
    }

    await this.validateCategory(dto.categoryId);

    try {
      return await this.prisma.product.create({
        data: {
          sku,
          name: dto.name.trim(),
          description: this.normalizeText(dto.description),
          brand: this.normalizeText(dto.brand),
          model: this.normalizeText(dto.model),
          unit: dto.unit?.trim() || 'pcs',

          defaultSellingPrice:
            dto.defaultSellingPrice !== undefined
              ? new Prisma.Decimal(dto.defaultSellingPrice)
              : null,

          defaultCostPrice:
            dto.defaultCostPrice !== undefined
              ? new Prisma.Decimal(dto.defaultCostPrice)
              : null,

          isActive: dto.isActive ?? true,
          trackInventory: dto.trackInventory ?? true,

          categoryId: dto.categoryId ?? null,
        },
        include: {
          category: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists.`,
        );
      }

      throw error;
    }
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (search) {
      where.OR = [
        {
          sku: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          model: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy:
      | Prisma.ProductOrderByWithRelationInput
      | Prisma.ProductOrderByWithRelationInput[] = query.sortBy
      ? ({
          [query.sortBy]: sortOrder,
        } as Prisma.ProductOrderByWithRelationInput)
      : [
          {
            isActive: 'desc',
          },
          {
            name: 'asc',
          },
        ];

    const [items, total, active, inactive, tracked] =
      await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            category: true,
          },
        }),

        this.prisma.product.count({
          where,
        }),

        this.prisma.product.count({
          where: {
            ...where,
            isActive: true,
          },
        }),

        this.prisma.product.count({
          where: {
            ...where,
            isActive: false,
          },
        }),

        this.prisma.product.count({
          where: {
            ...where,
            trackInventory: true,
          },
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
        tracked,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found.');
    }

    let sku: string | undefined;

    if (dto.sku !== undefined) {
      sku = this.normalizeSku(dto.sku);

      const duplicate = await this.prisma.product.findFirst({
        where: {
          sku,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists.`,
        );
      }
    }

    if (dto.categoryId !== undefined) {
      await this.validateCategory(dto.categoryId);
    }

    try {
      return await this.prisma.product.update({
        where: {
          id,
        },
        data: {
          ...(sku !== undefined && {
            sku,
          }),

          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),

          ...(dto.description !== undefined && {
            description: this.normalizeText(dto.description),
          }),

          ...(dto.brand !== undefined && {
            brand: this.normalizeText(dto.brand),
          }),

          ...(dto.model !== undefined && {
            model: this.normalizeText(dto.model),
          }),

          ...(dto.unit !== undefined && {
            unit: dto.unit.trim() || 'pcs',
          }),

          ...(dto.defaultSellingPrice !== undefined && {
            defaultSellingPrice: new Prisma.Decimal(dto.defaultSellingPrice),
          }),

          ...(dto.defaultCostPrice !== undefined && {
            defaultCostPrice: new Prisma.Decimal(dto.defaultCostPrice),
          }),

          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),

          ...(dto.trackInventory !== undefined && {
            trackInventory: dto.trackInventory,
          }),

          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId,
          }),
        },
        include: {
          category: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Product with SKU "${sku}" already exists.`,
        );
      }

      throw error;
    }
  }
}
