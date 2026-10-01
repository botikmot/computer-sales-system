import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, SalesInquiryStatus, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto.js';
import type { SalesListQueryDto } from './dto/sales-list-query.dto.js';

@Injectable()
export class SalesInquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateSalesInquiryDto, user: AuthenticatedUser) {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Sales inquiry must contain at least one item.',
      );
    }

    // The submitted branch must be accessible to the current user.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const branch = await this.prisma.branch.findUnique({
      where: {
        id: dto.branchId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: dto.customerId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const productIds = dto.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products were not found.');
    }

    const inquiryNo = `SI-${this.formatDate()}-${this.randomCode()}`;

    return this.prisma.salesInquiry.create({
      data: {
        inquiryNo,
        branchId: dto.branchId,
        customerId: dto.customerId,
        status: 'OPEN',
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        branch: true,
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(user: AuthenticatedUser, query: SalesListQueryDto) {
    // Non-admin users must have a branch.
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const allowedSortFields = [
      'inquiryNo',
      'inquiryDate',
      'status',
      'createdAt',
    ] as const;

    type SortField = (typeof allowedSortFields)[number];

    const requestedSort = query.sortBy as SortField | undefined;

    const sortBy: SortField = allowedSortFields.includes(
      requestedSort as SortField,
    )
      ? (requestedSort as SortField)
      : 'createdAt';

    const sortOrder: 'asc' | 'desc' =
      query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.SalesInquiryWhereInput =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    const normalizedSearch = search?.toUpperCase();

    const matchingStatus =
      normalizedSearch &&
      Object.values(SalesInquiryStatus).includes(
        normalizedSearch as SalesInquiryStatus,
      )
        ? (normalizedSearch as SalesInquiryStatus)
        : undefined;

    if (search) {
      where.OR = [
        {
          inquiryNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          items: {
            some: {
              product: {
                sku: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          items: {
            some: {
              product: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },

        ...(matchingStatus
          ? [
              {
                status: matchingStatus,
              },
            ]
          : []),
      ];
    }

    const orderBy = {
      [sortBy]: sortOrder,
    } as Prisma.SalesInquiryOrderByWithRelationInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesInquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: true,
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          quotations: true,
        },
      }),

      this.prisma.salesInquiry.count({
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

  async findOne(id: string, user: AuthenticatedUser) {
    const inquiry = await this.prisma.salesInquiry.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        quotations: true,
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Sales inquiry not found.');
    }

    // Protect access to the actual inquiry branch.
    this.branchAccessService.assertCanAccessBranch(user, inquiry.branchId);

    return inquiry;
  }

  private formatDate(): string {
    const date = new Date();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}${m}${d}`;
  }

  private randomCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
