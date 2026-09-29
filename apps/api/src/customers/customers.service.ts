import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: {
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('Customer code already exists.');
    }

    return this.prisma.customer.create({
      data: {
        code: dto.code,
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
}
