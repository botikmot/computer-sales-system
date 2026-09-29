import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateSupplierQuotationDto } from './dto/create-supplier-quotation.dto.js';

import type {
  SupplierQuotationRecord,
  SupplierQuotationWithRelations,
} from './supplier-quotation.types.js';

@Injectable()
export class SupplierQuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private generateQuotationNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const suffix = randomUUID().slice(0, 6).toUpperCase();

    return `SQ-${date}-${suffix}`;
  }

  private validateUniqueProducts(productIds: string[]): void {
    const uniqueProductIds = new Set(productIds);

    if (productIds.length !== uniqueProductIds.size) {
      throw new BadRequestException(
        'Duplicate products are not allowed in a supplier quotation.',
      );
    }
  }

  async create(
    dto: CreateSupplierQuotationDto,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationWithRelations> {
    this.validateUniqueProducts(dto.items.map((item) => item.productId));

    // Branch isolation must be checked against the actual requested branch.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const [branch, supplier, purchaseRequest] = await Promise.all([
      this.prisma.branch.findUnique({
        where: {
          id: dto.branchId,
        },
      }),

      this.prisma.supplier.findUnique({
        where: {
          id: dto.supplierId,
        },
      }),

      this.prisma.purchaseRequest.findUnique({
        where: {
          id: dto.purchaseRequestId,
        },
        include: {
          items: true,
        },
      }),
    ]);

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    if (!supplier || !supplier.isActive) {
      throw new NotFoundException('Supplier not found or inactive.');
    }

    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found.');
    }

    if (purchaseRequest.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Purchase request does not belong to the selected branch.',
      );
    }

    // Defense-in-depth: also verify the referenced purchase request
    // against the authenticated user's branch.
    this.branchAccessService.assertCanAccessBranch(
      user,
      purchaseRequest.branchId,
    );

    if (purchaseRequest.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved purchase requests can receive supplier quotations.',
      );
    }

    const requestedProductIds = new Set(
      purchaseRequest.items.map((item) => item.productId),
    );

    const invalidProducts = dto.items
      .map((item) => item.productId)
      .filter((productId) => !requestedProductIds.has(productId));

    if (invalidProducts.length > 0) {
      throw new BadRequestException(
        'Quotation contains a product that is not included in the purchase request.',
      );
    }

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

    const activeProductIds = new Set(products.map((product) => product.id));

    const inactiveProducts = dto.items
      .map((item) => item.productId)
      .filter((productId) => !activeProductIds.has(productId));

    if (inactiveProducts.length > 0) {
      throw new NotFoundException(
        'One or more quotation products are inactive or do not exist.',
      );
    }

    const subtotal = dto.items.reduce(
      (total, item) => total + item.quantity * item.unitCost,
      0,
    );

    try {
      return await this.prisma.supplierQuotation.create({
        data: {
          quotationNo: this.generateQuotationNo(),

          branchId: dto.branchId,
          supplierId: dto.supplierId,
          purchaseRequestId: dto.purchaseRequestId,

          status: 'DRAFT',

          quotationDate: dto.quotationDate
            ? new Date(dto.quotationDate)
            : new Date(),

          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,

          notes: dto.notes,

          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,

          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.quantity * item.unitCost,
            })),
          },
        },

        include: {
          branch: true,
          supplier: true,
          purchaseRequest: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException('Unable to create supplier quotation.');
    }
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationWithRelations> {
    const quotation = await this.prisma.supplierQuotation.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        supplier: true,
        purchaseRequest: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Supplier quotation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, quotation.branchId);

    return quotation;
  }

  async findAll(
    purchaseRequestId: string | undefined,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationWithRelations[]> {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? purchaseRequestId
          ? {
              purchaseRequestId,
            }
          : {}
        : {
            branchId: user.branchId!,
            ...(purchaseRequestId
              ? {
                  purchaseRequestId,
                }
              : {}),
          };

    return this.prisma.supplierQuotation.findMany({
      where,

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        branch: true,
        supplier: true,
        purchaseRequest: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async receive(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    const quotation = await this.findOne(id, user);

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft supplier quotations can be received.',
      );
    }

    return this.prisma.supplierQuotation.update({
      where: {
        id,
      },

      data: {
        status: 'RECEIVED',
      },
    });
  }

  async accept(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    const quotation = await this.findOne(id, user);

    if (quotation.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only received supplier quotations can be accepted.',
      );
    }

    return this.prisma.supplierQuotation.update({
      where: {
        id,
      },

      data: {
        status: 'ACCEPTED',
      },
    });
  }

  async reject(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SupplierQuotationRecord> {
    const quotation = await this.findOne(id, user);

    if (quotation.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only received supplier quotations can be rejected.',
      );
    }

    return this.prisma.supplierQuotation.update({
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
  ): Promise<SupplierQuotationRecord> {
    const quotation = await this.findOne(id, user);

    if (quotation.status !== 'DRAFT' && quotation.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only draft or received supplier quotations can be cancelled.',
      );
    }

    return this.prisma.supplierQuotation.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }
}
