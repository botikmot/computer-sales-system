import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryMovementType,
  InventoryReservationStatus,
  Prisma,
  ServiceJobStatus,
  UserRole,
  UserStatus,
} from '@computer-sales/database';

import { PrismaService } from '../database/prisma.service.js';

import { AddServiceJobPartDto } from './dto/add-service-job-part.dto.js';
import { CreateServiceJobDto } from './dto/create-service-job.dto.js';
import { DiagnoseServiceJobDto } from './dto/diagnose-service-job.dto.js';
import { IssueServicePartsDto } from './dto/issue-service-parts.dto.js';

@Injectable()
export class ServiceRepairService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceJobDto) {
    const branch = await this.prisma.branch.findUnique({
      where: {
        id: dto.branchId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }

    if (!branch.isActive) {
      throw new BadRequestException('Branch is inactive.');
    }

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: dto.customerId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    if (!customer.isActive) {
      throw new BadRequestException('Customer is inactive.');
    }

    if (dto.technicianId) {
      const technician = await this.prisma.user.findUnique({
        where: {
          id: dto.technicianId,
        },
      });

      if (!technician) {
        throw new NotFoundException('Technician not found.');
      }

      if (technician.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Technician is inactive.');
      }

      if (technician.role !== UserRole.TECHNICIAN) {
        throw new BadRequestException('Selected user is not a technician.');
      }

      if (technician.branchId && technician.branchId !== dto.branchId) {
        throw new BadRequestException(
          'Technician does not belong to the selected branch.',
        );
      }
    }

    const jobNo = `SJ-${this.generateReference()}`;

    return this.prisma.serviceJob.create({
      data: {
        jobNo,
        branchId: dto.branchId,
        customerId: dto.customerId,
        technicianId: dto.technicianId,
        status: ServiceJobStatus.DRAFT,
        notes: dto.notes,
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.serviceJob.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
        invoice: true,
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
        invoice: {
          include: {
            items: true,
            accountsReceivable: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    return job;
  }

  async diagnose(id: string, dto: DiagnoseServiceJobDto) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (
      job.status !== ServiceJobStatus.DRAFT &&
      job.status !== ServiceJobStatus.DIAGNOSING
    ) {
      throw new BadRequestException(
        'Only DRAFT or DIAGNOSING service jobs can be diagnosed.',
      );
    }

    return this.prisma.serviceJob.update({
      where: {
        id,
      },
      data: {
        status: ServiceJobStatus.AWAITING_APPROVAL,
        diagnosticFindings: dto.diagnosticFindings,
        laborCharge: new Prisma.Decimal(dto.laborCharge),
        notes: dto.notes ?? job.notes,
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async addPart(id: string, dto: AddServiceJobPartDto) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (
      job.status !== ServiceJobStatus.DRAFT &&
      job.status !== ServiceJobStatus.AWAITING_APPROVAL
    ) {
      throw new BadRequestException(
        'Parts can only be added before customer approval.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: {
        id: dto.productId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is inactive.');
    }

    if (!product.trackInventory) {
      throw new BadRequestException(
        'Selected product does not track inventory.',
      );
    }

    const existing = await this.prisma.serviceJobPart.findUnique({
      where: {
        serviceJobId_productId: {
          serviceJobId: id,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'This product is already listed as a service job part.',
      );
    }

    return this.prisma.serviceJobPart.create({
      data: {
        serviceJobId: id,
        productId: dto.productId,
        requiredQuantity: dto.requiredQuantity,
        issuedQuantity: 0,
        unitCost: 0,
        totalCost: 0,
        notes: dto.notes,
      },
      include: {
        serviceJob: true,
        product: true,
      },
    });
  }

  async approve(id: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (job.status !== ServiceJobStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        'Only service jobs awaiting customer approval can be approved.',
      );
    }

    if (!job.technicianId) {
      throw new BadRequestException(
        'A technician must be assigned before customer approval.',
      );
    }

    return this.prisma.serviceJob.update({
      where: {
        id,
      },
      data: {
        status: ServiceJobStatus.APPROVED,
        customerApproved: true,
        customerApprovedAt: new Date(),
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async start(id: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (job.status !== ServiceJobStatus.APPROVED) {
      throw new BadRequestException(
        'Only APPROVED service jobs can be started.',
      );
    }

    return this.prisma.serviceJob.update({
      where: {
        id,
      },
      data: {
        status: ServiceJobStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async issueParts(id: string, dto: IssueServicePartsDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const job = await tx.serviceJob.findUnique({
          where: {
            id,
          },
          include: {
            parts: true,
          },
        });

        if (!job) {
          throw new NotFoundException('Service job not found.');
        }

        if (job.status !== ServiceJobStatus.IN_PROGRESS) {
          throw new BadRequestException(
            'Parts can only be issued for IN_PROGRESS service jobs.',
          );
        }

        const productIds = dto.items.map((item) => item.productId);

        if (new Set(productIds).size !== productIds.length) {
          throw new BadRequestException(
            'A product can only appear once in a parts issuance request.',
          );
        }

        const jobPartMap = new Map(
          job.parts.map((part) => [part.productId, part]),
        );

        for (const requested of dto.items) {
          const jobPart = jobPartMap.get(requested.productId);

          if (!jobPart) {
            throw new NotFoundException(
              `Product ${requested.productId} is not listed as a required service part.`,
            );
          }

          const remaining = jobPart.requiredQuantity - jobPart.issuedQuantity;

          if (requested.quantity > remaining) {
            throw new BadRequestException(
              `Cannot issue ${requested.quantity} units for product ${requested.productId}. Only ${remaining} remain to be issued.`,
            );
          }
        }

        const products = await tx.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
        });

        if (products.length !== productIds.length) {
          throw new NotFoundException('One or more products were not found.');
        }

        const results = [];

        for (const requested of dto.items) {
          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: job.branchId,
                productId: requested.productId,
              },
            },
          });

          const physicalQuantity = balance?.quantity ?? 0;

          const reserved = await tx.inventoryReservation.aggregate({
            where: {
              branchId: job.branchId,
              productId: requested.productId,
              status: InventoryReservationStatus.RESERVED,
            },
            _sum: {
              quantity: true,
            },
          });

          const reservedQuantity = reserved._sum.quantity ?? 0;

          const availableQuantity = physicalQuantity - reservedQuantity;

          if (requested.quantity > availableQuantity) {
            throw new BadRequestException(
              `Insufficient available inventory for product ${requested.productId}. Available: ${availableQuantity}, requested: ${requested.quantity}.`,
            );
          }

          const currentCost = balance?.averageCost ?? new Prisma.Decimal(0);

          const jobPart = jobPartMap.get(requested.productId)!;

          const newIssuedQuantity = jobPart.issuedQuantity + requested.quantity;

          const additionalCost = currentCost.mul(requested.quantity);

          const newTotalCost = jobPart.totalCost.plus(additionalCost);

          const newUnitCost =
            newIssuedQuantity > 0
              ? newTotalCost.div(newIssuedQuantity)
              : new Prisma.Decimal(0);

          const newBalance = physicalQuantity - requested.quantity;

          if (!balance) {
            throw new BadRequestException(
              `Inventory balance does not exist for product ${requested.productId}.`,
            );
          }

          await tx.inventoryBalance.update({
            where: {
              id: balance.id,
            },
            data: {
              quantity: newBalance,
            },
          });

          await tx.serviceJobPart.update({
            where: {
              id: jobPart.id,
            },
            data: {
              issuedQuantity: newIssuedQuantity,
              unitCost: newUnitCost,
              totalCost: newTotalCost,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              branchId: job.branchId,
              productId: requested.productId,
              type: InventoryMovementType.REPAIR_ISSUE,

              unitCost: currentCost,
              totalCost: additionalCost,
              averageCostAfter: balance.averageCost,

              quantityChange: -requested.quantity,
              balanceAfter: newBalance,

              referenceType: 'SERVICE_JOB',
              referenceId: job.id,

              notes: `Parts issued for service job ${job.jobNo}.`,
            },
          });

          results.push({
            productId: requested.productId,
            quantityIssued: requested.quantity,
            unitCost: currentCost,
            totalCost: additionalCost,
            balanceAfter: newBalance,
          });
        }

        return {
          serviceJobId: job.id,
          jobNo: job.jobNo,
          issued: results,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async complete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({
        where: {
          id,
        },
        include: {
          parts: true,
        },
      });

      if (!job) {
        throw new NotFoundException('Service job not found.');
      }

      if (job.status !== ServiceJobStatus.IN_PROGRESS) {
        throw new BadRequestException(
          'Only IN_PROGRESS service jobs can be completed.',
        );
      }

      const incompletePart = job.parts.find(
        (part) => part.issuedQuantity < part.requiredQuantity,
      );

      if (incompletePart) {
        throw new BadRequestException(
          `Not all required parts have been issued for product ${incompletePart.productId}.`,
        );
      }

      return tx.serviceJob.update({
        where: {
          id,
        },
        data: {
          status: ServiceJobStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          branch: true,
          customer: true,
          technician: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
              status: true,
              branchId: true,
            },
          },
          parts: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async cancel(id: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (
      job.status === ServiceJobStatus.COMPLETED ||
      job.status === ServiceJobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'This service job can no longer be cancelled.',
      );
    }

    return this.prisma.serviceJob.update({
      where: {
        id,
      },
      data: {
        status: ServiceJobStatus.CANCELLED,
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }

  async assignTechnician(id: string, technicianId: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found.');
    }

    if (
      job.status !== ServiceJobStatus.DRAFT &&
      job.status !== ServiceJobStatus.AWAITING_APPROVAL
    ) {
      throw new BadRequestException(
        'Technician can only be assigned before the repair starts.',
      );
    }

    const technician = await this.prisma.user.findUnique({
      where: {
        id: technicianId,
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found.');
    }

    if (technician.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Technician is inactive.');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('Selected user is not a technician.');
    }

    if (technician.branchId && technician.branchId !== job.branchId) {
      throw new BadRequestException(
        'Technician does not belong to the service job branch.',
      );
    }

    return this.prisma.serviceJob.update({
      where: {
        id,
      },
      data: {
        technicianId: technician.id,
      },
      include: {
        branch: true,
        customer: true,
        technician: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            branchId: true,
          },
        },
        parts: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
