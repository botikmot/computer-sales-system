import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

import { GetCustomersQueryDto } from './dto/get-customers-query.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private async generateNextCustomerCode(): Promise<string> {
    const latestCustomer = await this.prisma.customer.findFirst({
      where: {
        code: {
          startsWith: 'CUST-',
        },
      },
      orderBy: {
        code: 'desc',
      },
      select: {
        code: true,
      },
    });

    let nextNumber = 1;

    if (latestCustomer) {
      const match = latestCustomer.code.match(/^CUST-(\d+)$/);

      if (match) {
        const currentNumber = Number(match[1]);

        if (Number.isFinite(currentNumber)) {
          nextNumber = currentNumber + 1;
        }
      }
    }

    return `CUST-${String(nextNumber).padStart(6, '0')}`;
  }

  async create(dto: CreateCustomerDto) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await this.generateNextCustomerCode();

      try {
        return await this.prisma.customer.create({
          data: {
            code,
            name: dto.name.trim(),
            contactNumber: dto.contactNumber?.trim() || null,
            email: dto.email?.trim().toLowerCase() || null,
            address: dto.address?.trim() || null,
            taxId: dto.taxId?.trim() || null,
            isActive: dto.isActive ?? true,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique customer code. Please try again.',
    );
  }

  async findAll(query: GetCustomersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim() || undefined;

    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'asc';

    const isActive =
      query.isActive !== undefined ? query.isActive === 'true' : undefined;

    const where: Prisma.CustomerWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),

      ...(search
        ? {
            OR: [
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
            ],
          }
        : {}),
    };

    const orderBy = {
      [sortBy]: sortOrder,
    } as Prisma.CustomerOrderByWithRelationInput;

    const activeWhere: Prisma.CustomerWhereInput = {
      ...where,
      isActive: true,
    };

    const inactiveWhere: Prisma.CustomerWhereInput = {
      ...where,
      isActive: false,
    };

    const [items, total, active, inactive] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,

        skip: (page - 1) * limit,
        take: limit,

        orderBy,

        select: {
          id: true,
          code: true,
          name: true,
          contactNumber: true,
          email: true,
          address: true,
          taxId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.customer.count({
        where,
      }),

      this.prisma.customer.count({
        where: activeWhere,
      }),

      this.prisma.customer.count({
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

  async findOne(id: string, user: AuthenticatedUser) {
    /*
     * Customer is global master data.
     *
     * We therefore allow the customer record itself to be read
     * without branch filtering.
     *
     * However, branch-specific transactions attached to the
     * customer must be restricted to the user's branch.
     */

    const transactionWhere =
      user.role === UserRole.ADMIN
        ? undefined
        : {
            branchId: user.branchId!,
          };

    if (user.role !== UserRole.ADMIN) {
      this.branchAccessService.assertCanAccessOptionalBranch(
        user,
        user.branchId,
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: {
        id,
      },

      include: {
        salesInquiries:
          transactionWhere !== undefined
            ? {
                where: transactionWhere,
                orderBy: {
                  createdAt: 'desc',
                },
              }
            : true,

        salesQuotations:
          transactionWhere !== undefined
            ? {
                where: transactionWhere,
                orderBy: {
                  createdAt: 'desc',
                },
              }
            : true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found.');
    }

    let code: string | undefined;

    if (dto.code !== undefined) {
      code = dto.code.trim().toUpperCase();

      const duplicate = await this.prisma.customer.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Customer code already exists.');
      }
    }

    try {
      return await this.prisma.customer.update({
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

          ...(dto.contactNumber !== undefined && {
            contactNumber: dto.contactNumber.trim(),
          }),

          ...(dto.email !== undefined && {
            email: dto.email.trim().toLowerCase(),
          }),

          ...(dto.address !== undefined && {
            address: dto.address.trim(),
          }),

          ...(dto.taxId !== undefined && {
            taxId: dto.taxId.trim(),
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
        throw new ConflictException('Customer code already exists.');
      }

      throw error;
    }
  }
}
