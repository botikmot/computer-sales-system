import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  ServiceInvoiceItemType,
  ServiceInvoiceStatus,
  ServicePaymentMode,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

import { PrismaService } from '../database/prisma.service.js';

import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto.js';

import { ServiceInvoiceQueryDto } from './dto/service-invoice-query.dto.js';

@Injectable()
export class ServiceInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createFromServiceJob(
    serviceJobId: string,
    dto: CreateServiceInvoiceDto,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({
        where: {
          id: serviceJobId,
        },
        include: {
          customer: true,
          branch: true,
          parts: {
            include: {
              product: true,
            },
          },
          invoice: true,
        },
      });

      if (!job) {
        throw new NotFoundException('Service job not found.');
      }

      this.branchAccessService.assertCanAccessBranch(user, job.branchId);

      if (job.status !== 'COMPLETED') {
        throw new BadRequestException(
          'Only completed service jobs can be invoiced.',
        );
      }

      if (job.invoice) {
        throw new ConflictException(
          'This service job already has a service invoice.',
        );
      }

      const paymentMode =
        dto.paymentMode === 'CREDIT'
          ? ServicePaymentMode.CREDIT
          : ServicePaymentMode.CASH;

      const laborCharge = new Prisma.Decimal(job.laborCharge);

      const invoiceItems: {
        itemType: ServiceInvoiceItemType;
        productId?: string;
        description: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      if (laborCharge.gt(0)) {
        invoiceItems.push({
          itemType: ServiceInvoiceItemType.LABOR,
          description: 'Repair labor',
          quantity: new Prisma.Decimal(1),
          unitPrice: laborCharge,
          subtotal: laborCharge,
        });
      }

      for (const part of job.parts) {
        if (part.issuedQuantity <= 0) {
          continue;
        }

        const quantity = new Prisma.Decimal(part.issuedQuantity);

        const unitPrice = part.product.defaultSellingPrice ?? part.unitCost;

        const subtotal = unitPrice.mul(quantity);

        invoiceItems.push({
          itemType: ServiceInvoiceItemType.PART,
          productId: part.productId,
          description: part.product.name,
          quantity,
          unitPrice,
          subtotal,
        });
      }

      if (!invoiceItems.length) {
        throw new BadRequestException(
          'Service job has no billable labor or issued parts.',
        );
      }

      const subtotal = invoiceItems.reduce(
        (sum, item) => sum.plus(item.subtotal),
        new Prisma.Decimal(0),
      );

      const discount = new Prisma.Decimal(0);
      const tax = new Prisma.Decimal(0);
      const total = subtotal.minus(discount).plus(tax);

      const invoiceNo = `SVI-${this.generateReference()}`;

      const invoice = await tx.serviceInvoice.create({
        data: {
          invoiceNo,

          branchId: job.branchId,
          customerId: job.customerId,
          serviceJobId: job.id,

          status: ServiceInvoiceStatus.POSTED,
          paymentMode,

          invoiceDate: new Date(),

          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,

          subtotal,
          discount,
          tax,
          total,

          amountPaid: new Prisma.Decimal(0),
          balanceDue: total,

          notes: dto.notes ?? job.notes,

          items: {
            create: invoiceItems,
          },
        },
        include: {
          branch: true,
          customer: true,
          serviceJob: true,
          items: {
            include: {
              product: true,
            },
          },
          accountsReceivable: true,
        },
      });

      if (paymentMode === ServicePaymentMode.CREDIT) {
        await tx.accountsReceivable.create({
          data: {
            branchId: job.branchId,
            customerId: job.customerId,

            serviceInvoiceId: invoice.id,

            originalAmount: total,
            amountPaid: new Prisma.Decimal(0),
            balanceDue: total,

            status: 'OPEN',

            dueDate: invoice.dueDate,
            notes: invoice.notes,
          },
        });
      }

      return tx.serviceInvoice.findUniqueOrThrow({
        where: {
          id: invoice.id,
        },
        include: {
          branch: true,
          customer: true,
          serviceJob: true,
          items: {
            include: {
              product: true,
            },
          },
          accountsReceivable: true,
        },
      });
    });
  }

  async findAll(query: ServiceInvoiceQueryDto, user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.ServiceInvoiceWhereInput = {
      ...(user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          }),

      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                invoiceNo: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customer: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                serviceJob: {
                  is: {
                    jobNo: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } as Prisma.ServiceInvoiceOrderByWithRelationInput;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceInvoice.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          branch: true,
          customer: true,
          serviceJob: true,
          items: {
            include: {
              product: true,
            },
          },
          accountsReceivable: true,
        },
      }),

      this.prisma.serviceInvoice.count({
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

  async findOne(id: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.serviceInvoice.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        serviceJob: true,
        items: {
          include: {
            product: true,
          },
        },
        accountsReceivable: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Service invoice not found.');
    }
    this.branchAccessService.assertCanAccessBranch(user, invoice.branchId);

    return invoice;
  }

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }
}
