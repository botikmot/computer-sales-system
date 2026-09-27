import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto.js';

@Injectable()
export class SalesInquiryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesInquiryDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Sales inquiry must contain at least one item.',
      );
    }

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

  async findAll() {
    return this.prisma.salesInquiry.findMany({
      orderBy: {
        createdAt: 'desc',
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
  }

  async findOne(id: string) {
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
