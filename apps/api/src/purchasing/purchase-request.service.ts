import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import {
  CreatePurchaseRequestDto,
  PurchaseRequestItemDto,
} from './dto/create-purchase-request.dto.js';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto.js';

import { PurchaseRequestQueryDto } from './dto/purchase-request-query.dto.js';

import type {
  PurchaseRequestRecord,
  PurchaseRequestWithRelations,
  PurchaseRequestListResponse,
} from './purchase-request.types.js';

const PURCHASE_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private validateUniqueProducts(items: PurchaseRequestItemDto[]): void {
    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);

    if (productIds.length !== uniqueProductIds.size) {
      throw new BadRequestException(
        'Duplicate products are not allowed in a purchase request.',
      );
    }
  }

  private generateRequestNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

    return `PR-${date}-${suffix}`;
  }

  async create(
    dto: CreatePurchaseRequestDto,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    this.validateUniqueProducts(dto.items);

    // Branch isolation
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const [branch, products] = await Promise.all([
      this.prisma.branch.findUnique({
        where: {
          id: dto.branchId,
        },
      }),

      this.prisma.product.findMany({
        where: {
          id: {
            in: dto.items.map((item) => item.productId),
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    const foundProductIds = new Set(products.map((product) => product.id));

    const missingProductIds = dto.items
      .map((item) => item.productId)
      .filter((productId) => !foundProductIds.has(productId));

    if (missingProductIds.length > 0) {
      throw new NotFoundException(
        `Product(s) not found or inactive: ${missingProductIds.join(', ')}`,
      );
    }

    try {
      return await this.prisma.purchaseRequest.create({
        data: {
          requestNo: this.generateRequestNo(),

          branchId: dto.branchId,

          purpose: dto.purpose,
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

          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException(
        'Unable to create purchase request. Please try again.',
      );
    }
  }

  async findAll(
    query: PurchaseRequestQueryDto,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // Validate status.
    if (query.status && !PURCHASE_REQUEST_STATUSES.includes(query.status)) {
      throw new BadRequestException('Invalid purchase request status.');
    }

    // Validate optional branch access.
    this.branchAccessService.assertCanAccessOptionalBranch(
      user,
      user.role === UserRole.ADMIN ? query.branchId : user.branchId,
    );

    const where: Prisma.PurchaseRequestWhereInput = {};

    // Search
    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        {
          requestNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          purpose: {
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
      ];
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Branch isolation / filtering
    if (user.role === UserRole.ADMIN) {
      if (query.branchId) {
        where.branchId = query.branchId;
      }
    } else {
      where.branchId = user.branchId!;
    }

    // Allowed sort fields
    const allowedSortFields = [
      'requestNo',
      'purpose',
      'status',
      'createdAt',
    ] as const;

    const sortBy = allowedSortFields.includes(
      query.sortBy as (typeof allowedSortFields)[number],
    )
      ? query.sortBy!
      : 'createdAt';

    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy: Prisma.PurchaseRequestOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy,
        skip,
        take: limit,

        include: {
          branch: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      }),

      this.prisma.purchaseRequest.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: {
        id,
      },

      include: {
        branch: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Purchase request not found.');
    }

    // Branch isolation
    this.branchAccessService.assertCanAccessBranch(user, request.branchId);

    return request;
  }

  async update(
    id: string,
    dto: UpdatePurchaseRequestDto,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestWithRelations> {
    const existing = await this.findOne(id, user);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase requests can be edited.',
      );
    }

    if (dto.items) {
      this.validateUniqueProducts(dto.items);
    }

    /*
     * If branchId is supplied during update, the authenticated
     * user must be allowed to access the TARGET branch too.
     */
    if (dto.branchId) {
      this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

      const branch = await this.prisma.branch.findUnique({
        where: {
          id: dto.branchId,
        },
      });

      if (!branch) {
        throw new NotFoundException('Branch not found.');
      }
    }

    if (dto.items) {
      const products = await this.prisma.product.findMany({
        where: {
          id: {
            in: dto.items.map((item) => item.productId),
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      const foundProductIds = new Set(products.map((item) => item.id));

      const missingProductIds = dto.items
        .map((item) => item.productId)
        .filter((productId) => !foundProductIds.has(productId));

      if (missingProductIds.length > 0) {
        throw new NotFoundException(
          `Product(s) not found or inactive: ${missingProductIds.join(', ')}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseRequestItem.deleteMany({
          where: {
            purchaseRequestId: id,
          },
        });
      }

      return tx.purchaseRequest.update({
        where: {
          id,
        },

        data: {
          branchId: dto.branchId,
          purpose: dto.purpose,
          notes: dto.notes,

          ...(dto.items
            ? {
                items: {
                  create: dto.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    notes: item.notes,
                  })),
                },
              }
            : {}),
        },

        include: {
          branch: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async submit(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id, user);

    if (request.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase requests can be submitted.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: {
        id,
      },

      data: {
        status: 'SUBMITTED',
      },
    });
  }

  async approve(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id, user);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted purchase requests can be approved.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: {
        id,
      },

      data: {
        status: 'APPROVED',
      },
    });
  }

  async reject(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id, user);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted purchase requests can be rejected.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: {
        id,
      },

      data: {
        status: 'REJECTED',
      },
    });
  }

  async cancel(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id, user);

    if (request.status !== 'DRAFT' && request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only draft or submitted purchase requests can be cancelled.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }
}
