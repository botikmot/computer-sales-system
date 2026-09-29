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

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateCustomerDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.customer.findUnique({
      where: {
        code,
      },
    });

    if (existing) {
      throw new ConflictException('Customer code already exists.');
    }

    return this.prisma.customer.create({
      data: {
        code,
        name: dto.name,
        contactNumber: dto.contactNumber,
        email: dto.email,
        address: dto.address,
        taxId: dto.taxId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.customer.findMany({
      orderBy: {
        name: 'asc',
      },
    });
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
