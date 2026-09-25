import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type {
  PurchaseRequestRecord,
  PurchaseRequestWithRelations,
} from './purchase-request.types.js';

import {
  CreatePurchaseRequestDto,
  PurchaseRequestItemDto,
} from './dto/create-purchase-request.dto.js';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto.js';

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
  constructor(private readonly prisma: PrismaService) {}

  private validateUniqueProducts(items: PurchaseRequestItemDto[]) {
    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);

    if (productIds.length !== uniqueProductIds.size) {
      throw new BadRequestException(
        'Duplicate products are not allowed in a purchase request.',
      );
    }
  }

  private generateRequestNo() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

    return `PR-${date}-${suffix}`;
  }

  async create(
    dto: CreatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    this.validateUniqueProducts(dto.items);

    const [branch, products] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: dto.branchId },
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
    } catch (error) {
      throw new ConflictException(
        'Unable to create purchase request. Please try again.',
      );
    }
  }

  async findAll(
    branchId?: string,
    status?: PurchaseRequestStatus,
  ): Promise<PurchaseRequestWithRelations[]> {
    if (status && !PURCHASE_REQUEST_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid purchase request status.');
    }

    return this.prisma.purchaseRequest.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
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
  }

  async findOne(id: string): Promise<PurchaseRequestWithRelations> {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id },
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

    return request;
  }

  async update(
    id: string,
    dto: UpdatePurchaseRequestDto,
  ): Promise<PurchaseRequestWithRelations> {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase requests can be edited.',
      );
    }

    if (dto.items) {
      this.validateUniqueProducts(dto.items);
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
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
        where: { id },
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

  async submit(id: string): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id);

    if (request.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase requests can be submitted.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
      },
    });
  }

  async approve(id: string): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted purchase requests can be approved.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async reject(id: string): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted purchase requests can be rejected.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async cancel(id: string): Promise<PurchaseRequestRecord> {
    const request = await this.findOne(id);

    if (request.status !== 'DRAFT' && request.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only draft or submitted purchase requests can be cancelled.',
      );
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}
