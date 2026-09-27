import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        salesInquiries: true,
        salesQuotations: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }
}
