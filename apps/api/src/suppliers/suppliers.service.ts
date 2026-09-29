import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { SupplierQueryDto } from './dto/supplier-query.dto.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(value: string): string {
    return value.trim().toUpperCase();
  }

  private normalizeText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized === '' ? null : normalized;
  }

  async create(dto: CreateSupplierDto) {
    const code = this.normalizeCode(dto.code);

    const existingSupplier = await this.prisma.supplier.findUnique({
      where: {
        code,
      },
    });

    if (existingSupplier) {
      throw new ConflictException(
        `Supplier with code "${code}" already exists.`,
      );
    }

    try {
      return await this.prisma.supplier.create({
        data: {
          code,
          name: dto.name.trim(),
          contactPerson: this.normalizeText(dto.contactPerson),
          contactNumber: this.normalizeText(dto.contactNumber),
          email: this.normalizeText(dto.email)?.toLowerCase() ?? null,
          address: this.normalizeText(dto.address),
          taxId: this.normalizeText(dto.taxId),
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Supplier with code "${code}" already exists.`,
        );
      }

      throw error;
    }
  }

  async findAll(query: SupplierQueryDto) {
    const where: Prisma.SupplierWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        {
          code: {
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
          contactPerson: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          contactNumber: {
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
      ];
    }

    return this.prisma.supplier.findMany({
      where,
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
    const supplier = await this.prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found.');
    }

    let code: string | undefined;

    if (dto.code !== undefined) {
      code = this.normalizeCode(dto.code);

      const duplicate = await this.prisma.supplier.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Supplier with code "${code}" already exists.`,
        );
      }
    }

    try {
      return await this.prisma.supplier.update({
        where: {
          id,
        },
        data: {
          ...(code !== undefined && {
            code,
          }),

          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),

          ...(dto.contactPerson !== undefined && {
            contactPerson: this.normalizeText(dto.contactPerson),
          }),

          ...(dto.contactNumber !== undefined && {
            contactNumber: this.normalizeText(dto.contactNumber),
          }),

          ...(dto.email !== undefined && {
            email: this.normalizeText(dto.email)?.toLowerCase() ?? null,
          }),

          ...(dto.address !== undefined && {
            address: this.normalizeText(dto.address),
          }),

          ...(dto.taxId !== undefined && {
            taxId: this.normalizeText(dto.taxId),
          }),

          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Supplier with code "${code}" already exists.`,
        );
      }

      throw error;
    }
  }
}
