import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryAdjustmentStatus,
  InventoryMovementType,
  Prisma,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CountInventoryAdjustmentDto } from './dto/count-inventory-adjustment.dto.js';
import { RejectInventoryAdjustmentDto } from './dto/reject-inventory-adjustment.dto.js';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async create(dto: CreateInventoryAdjustmentDto, user: AuthenticatedUser) {
    // User can only create an adjustment for an accessible branch.
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

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

    const adjustmentNo = `IA-${this.generateReference()}`;

    return this.prisma.inventoryAdjustment.create({
      data: {
        adjustmentNo,
        branchId: dto.branchId,
        notes: dto.notes,
        status: InventoryAdjustmentStatus.DRAFT,
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

  async findAll(user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const where =
      user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          };

    return this.prisma.inventoryAdjustment.findMany({
      where,

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

        createdBy: true,
        approvedBy: true,
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
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

        createdBy: true,
        approvedBy: true,
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found.');
    }

    // Always authorize against the actual record branch.
    this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

    return adjustment;
  }

  async count(
    id: string,
    dto: CountInventoryAdjustmentDto,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const adjustment = await tx.inventoryAdjustment.findUnique({
          where: {
            id,
          },
        });

        if (!adjustment) {
          throw new NotFoundException('Inventory adjustment not found.');
        }

        // Defense-in-depth branch authorization inside transaction.
        this.branchAccessService.assertCanAccessBranch(
          user,
          adjustment.branchId,
        );

        if (adjustment.status !== InventoryAdjustmentStatus.DRAFT) {
          throw new BadRequestException(
            'Only DRAFT inventory adjustments can be counted.',
          );
        }

        const productIds = dto.items.map((item) => item.productId);

        const uniqueProductIds = new Set(productIds);

        if (uniqueProductIds.size !== productIds.length) {
          throw new BadRequestException(
            'A product can only appear once in an inventory adjustment.',
          );
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

        for (const product of products) {
          if (!product.isActive) {
            throw new BadRequestException(
              `Product ${product.sku} is inactive.`,
            );
          }

          if (!product.trackInventory) {
            throw new BadRequestException(
              `Product ${product.sku} does not track inventory.`,
            );
          }
        }

        const balances = await tx.inventoryBalance.findMany({
          where: {
            branchId: adjustment.branchId,
            productId: {
              in: productIds,
            },
          },
        });

        const balanceMap = new Map(
          balances.map((balance) => [balance.productId, balance]),
        );

        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );

        const items = dto.items.map((item) => {
          const balance = balanceMap.get(item.productId);

          const product = productMap.get(item.productId)!;

          const systemQuantity = balance?.quantity ?? 0;

          const averageCost =
            balance?.averageCost ??
            product.defaultCostPrice ??
            new Prisma.Decimal(0);

          const difference = item.countedQuantity - systemQuantity;

          const totalCost = averageCost.mul(difference);

          return {
            productId: item.productId,
            systemQuantity,
            countedQuantity: item.countedQuantity,
            difference,
            unitCost: averageCost,
            totalCost,
            reason: item.reason,
            notes: item.notes,
          };
        });

        const hasDifference = items.some((item) => item.difference !== 0);

        await tx.inventoryAdjustmentItem.deleteMany({
          where: {
            adjustmentId: id,
          },
        });

        await tx.inventoryAdjustmentItem.createMany({
          data: items.map((item) => ({
            adjustmentId: id,
            productId: item.productId,
            systemQuantity: item.systemQuantity,
            countedQuantity: item.countedQuantity,
            difference: item.difference,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            reason: item.reason,
            notes: item.notes,
          })),
        });

        const nextStatus = hasDifference
          ? InventoryAdjustmentStatus.COUNTED
          : InventoryAdjustmentStatus.COUNTED;

        return tx.inventoryAdjustment.update({
          where: {
            id,
          },

          data: {
            status: nextStatus,
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
      },

      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async confirm(id: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
        },
      });

      if (!adjustment) {
        throw new NotFoundException('Inventory adjustment not found.');
      }

      this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

      if (adjustment.status !== InventoryAdjustmentStatus.COUNTED) {
        throw new BadRequestException(
          'Only COUNTED inventory adjustments can be confirmed.',
        );
      }

      if (!adjustment.items.length) {
        throw new BadRequestException('Inventory adjustment has no items.');
      }

      const hasDifference = adjustment.items.some(
        (item) => item.difference !== 0,
      );

      if (hasDifference) {
        throw new BadRequestException(
          'This adjustment has differences and must be submitted for approval.',
        );
      }

      return tx.inventoryAdjustment.update({
        where: {
          id,
        },

        data: {
          status: InventoryAdjustmentStatus.CONFIRMED,
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

  async submitForApproval(id: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
        },
      });

      if (!adjustment) {
        throw new NotFoundException('Inventory adjustment not found.');
      }

      this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

      if (adjustment.status !== InventoryAdjustmentStatus.COUNTED) {
        throw new BadRequestException(
          'Only COUNTED inventory adjustments can be submitted for approval.',
        );
      }

      if (!adjustment.items.length) {
        throw new BadRequestException('Inventory adjustment has no items.');
      }

      const hasDifference = adjustment.items.some(
        (item) => item.difference !== 0,
      );

      if (!hasDifference) {
        throw new BadRequestException(
          'There is no inventory difference requiring approval.',
        );
      }

      return tx.inventoryAdjustment.update({
        where: {
          id,
        },

        data: {
          status: InventoryAdjustmentStatus.FOR_APPROVAL,
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

  async approve(id: string, user: AuthenticatedUser) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: {
        id,
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

    if (adjustment.status !== InventoryAdjustmentStatus.FOR_APPROVAL) {
      throw new BadRequestException(
        'Only inventory adjustments awaiting approval can be approved.',
      );
    }

    return this.prisma.inventoryAdjustment.update({
      where: {
        id,
      },

      data: {
        status: InventoryAdjustmentStatus.APPROVED,
        approvedAt: new Date(),
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

  async reject(
    id: string,
    dto: RejectInventoryAdjustmentDto,
    user: AuthenticatedUser,
  ) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: {
        id,
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

    if (adjustment.status !== InventoryAdjustmentStatus.FOR_APPROVAL) {
      throw new BadRequestException(
        'Only inventory adjustments awaiting approval can be rejected.',
      );
    }

    return this.prisma.inventoryAdjustment.update({
      where: {
        id,
      },

      data: {
        status: InventoryAdjustmentStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
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

  async post(id: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(
      async (tx) => {
        const adjustment = await tx.inventoryAdjustment.findUnique({
          where: {
            id,
          },

          include: {
            items: true,
          },
        });

        if (!adjustment) {
          throw new NotFoundException('Inventory adjustment not found.');
        }

        // Critical: branch check immediately before inventory mutation.
        this.branchAccessService.assertCanAccessBranch(
          user,
          adjustment.branchId,
        );

        const canPost =
          adjustment.status === InventoryAdjustmentStatus.CONFIRMED ||
          adjustment.status === InventoryAdjustmentStatus.APPROVED;

        if (!canPost) {
          throw new BadRequestException(
            'Only CONFIRMED or APPROVED inventory adjustments can be posted.',
          );
        }

        if (!adjustment.items.length) {
          throw new BadRequestException('Inventory adjustment has no items.');
        }

        for (const item of adjustment.items) {
          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: adjustment.branchId,
                productId: item.productId,
              },
            },
          });

          const currentQuantity = balance?.quantity ?? 0;

          if (currentQuantity !== item.systemQuantity) {
            throw new ConflictException(
              `Inventory changed for product ${item.productId} after physical count. Please recount the item.`,
            );
          }
        }

        for (const item of adjustment.items) {
          if (item.difference === 0) {
            continue;
          }

          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: adjustment.branchId,
                productId: item.productId,
              },
            },
          });

          const currentQuantity = balance?.quantity ?? 0;

          const newQuantity = currentQuantity + item.difference;

          if (newQuantity < 0) {
            throw new BadRequestException(
              `Inventory quantity cannot become negative for product ${item.productId}.`,
            );
          }

          const averageCost = balance?.averageCost ?? item.unitCost;

          if (balance) {
            await tx.inventoryBalance.update({
              where: {
                id: balance.id,
              },

              data: {
                quantity: newQuantity,
                averageCost,
              },
            });
          } else {
            await tx.inventoryBalance.create({
              data: {
                branchId: adjustment.branchId,
                productId: item.productId,
                quantity: newQuantity,
                averageCost,
              },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              branchId: adjustment.branchId,
              productId: item.productId,
              type: InventoryMovementType.ADJUSTMENT,

              unitCost: averageCost,
              totalCost: averageCost.mul(item.difference),
              averageCostAfter: averageCost,

              quantityChange: item.difference,
              balanceAfter: newQuantity,

              referenceType: 'INVENTORY_ADJUSTMENT',
              referenceId: adjustment.id,

              notes: item.notes ?? item.reason ?? adjustment.notes,
            },
          });
        }

        return tx.inventoryAdjustment.update({
          where: {
            id,
          },

          data: {
            status: InventoryAdjustmentStatus.POSTED,
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
      },

      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: {
        id,
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, adjustment.branchId);

    if (
      adjustment.status === InventoryAdjustmentStatus.POSTED ||
      adjustment.status === InventoryAdjustmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'This inventory adjustment can no longer be cancelled.',
      );
    }

    return this.prisma.inventoryAdjustment.update({
      where: {
        id,
      },

      data: {
        status: InventoryAdjustmentStatus.CANCELLED,
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

  private generateReference(): string {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }
}
