import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import { PrismaService } from '../database/prisma.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import type { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto.js';

@Injectable()
export class SalesQuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateSalesQuotationDto, user: AuthenticatedUser) {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Sales quotation must contain at least one item.',
      );
    }

    // Prevent creating a quotation for another branch.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    const inquiry = await this.prisma.salesInquiry.findUnique({
      where: {
        id: dto.inquiryId,
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Sales inquiry not found.');
    }

    if (inquiry.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Quotation branch does not match the inquiry branch.',
      );
    }

    if (inquiry.customerId !== dto.customerId) {
      throw new BadRequestException(
        'Quotation customer does not match the inquiry customer.',
      );
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

    let subtotal = new Prisma.Decimal(0);

    const quotationItems = dto.items.map((item) => {
      const lineSubtotal = new Prisma.Decimal(item.unitPrice).mul(
        item.quantity,
      );

      subtotal = subtotal.plus(lineSubtotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        subtotal: lineSubtotal,
      };
    });

    const discount = new Prisma.Decimal(dto.discount ?? 0);

    const tax = new Prisma.Decimal(dto.tax ?? 0);

    const total = subtotal.minus(discount).plus(tax);

    if (total.lt(0)) {
      throw new BadRequestException('Quotation total cannot be negative.');
    }

    const quotationNo = `SQ-${this.formatDate()}-${this.randomCode()}`;

    const salesperson = await this.prisma.user.findUnique({
      where: {
        id: dto.salespersonId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        branchId: true,
      },
    });

    if (!salesperson) {
      throw new NotFoundException('Salesperson not found.');
    }

    if (salesperson.status !== 'ACTIVE') {
      throw new BadRequestException('Salesperson is not active.');
    }

    if (salesperson.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Salesperson branch does not match the quotation branch.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.salesQuotation.create({
        data: {
          quotationNo,
          branchId: dto.branchId,
          customerId: dto.customerId,
          inquiryId: dto.inquiryId,
          createdById: salesperson.id,
          status: 'DRAFT',
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          subtotal,
          discount,
          tax,
          total,
          notes: dto.notes,
          items: {
            create: quotationItems,
          },
        },
        include: {
          branch: true,
          customer: true,
          inquiry: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      await tx.salesInquiry.update({
        where: {
          id: dto.inquiryId,
        },
        data: {
          status: 'QUOTED',
        },
      });

      return tx.salesQuotation.findUniqueOrThrow({
        where: {
          id: quotation.id,
        },
        include: {
          branch: true,
          customer: true,
          inquiry: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async findAll(user: AuthenticatedUser) {
    // Non-admin users must belong to a branch.
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    return this.prisma.salesQuotation.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        inquiry: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        inquiry: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Sales quotation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, quotation.branchId);

    return quotation;
  }

  async send(id: string, user: AuthenticatedUser) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: {
        id,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Sales quotation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, quotation.branchId);

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotations can be sent.');
    }

    return this.prisma.salesQuotation.update({
      where: {
        id,
      },
      data: {
        status: 'SENT',
      },
    });
  }

  async accept(id: string, user: AuthenticatedUser) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: {
        id,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Sales quotation not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, quotation.branchId);

    if (quotation.status !== 'SENT') {
      throw new BadRequestException('Only sent quotations can be accepted.');
    }

    return this.prisma.salesQuotation.update({
      where: {
        id,
      },
      data: {
        status: 'ACCEPTED',
      },
    });
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
