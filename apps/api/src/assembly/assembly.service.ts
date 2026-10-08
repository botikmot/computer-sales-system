import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssemblyStatus,
  InventoryMovementType,
  Prisma,
  UserRole,
} from '@computer-sales/database';

import { BranchAccessService } from '../auth/branch-access.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PrismaService } from '../database/prisma.service.js';

import { CreateBomDto } from './dto/create-bom.dto.js';
import { CreateAssemblyDto } from './dto/create-assembly.dto.js';
import { AssemblyQueryDto } from './dto/assembly-query.dto.js';
import { BomQueryDto } from './dto/bom-query.dto.js';

@Injectable()
export class AssemblyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  async createBom(dto: CreateBomDto, user: AuthenticatedUser) {
    const finishedProduct = await this.prisma.product.findUnique({
      where: { id: dto.finishedProductId },
    });

    if (!finishedProduct) {
      throw new NotFoundException('Finished product not found.');
    }

    if (!finishedProduct.isActive) {
      throw new BadRequestException('Finished product is inactive.');
    }

    if (!finishedProduct.trackInventory) {
      throw new BadRequestException('Finished product must track inventory.');
    }

    const componentIds = dto.items.map((item) => item.componentProductId);

    if (new Set(componentIds).size !== componentIds.length) {
      throw new BadRequestException(
        'A component product can only appear once in a BOM.',
      );
    }

    if (componentIds.includes(dto.finishedProductId)) {
      throw new BadRequestException(
        'Finished product cannot be its own component.',
      );
    }

    const components = await this.prisma.product.findMany({
      where: {
        id: {
          in: componentIds,
        },
      },
    });

    if (components.length !== componentIds.length) {
      throw new NotFoundException(
        'One or more component products were not found.',
      );
    }

    for (const product of components) {
      if (!product.isActive) {
        throw new BadRequestException(
          `Component product ${product.sku} is inactive.`,
        );
      }

      if (!product.trackInventory) {
        throw new BadRequestException(
          `Component product ${product.sku} does not track inventory.`,
        );
      }
    }

    const existingBom = await this.prisma.billOfMaterial.findUnique({
      where: {
        productId: dto.finishedProductId,
      },
    });

    if (existingBom) {
      throw new ConflictException(
        'A BOM already exists for this finished product.',
      );
    }

    return this.prisma.billOfMaterial.create({
      data: {
        productId: dto.finishedProductId,
        items: {
          create: dto.items.map((item) => ({
            componentProductId: item.componentProductId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        product: true,
        items: {
          include: {
            componentProduct: true,
          },
        },
      },
    });
  }

  async findBom(id: string, user: AuthenticatedUser) {
    const bom = await this.prisma.billOfMaterial.findUnique({
      where: { id },
      include: {
        product: true,
        items: {
          include: {
            componentProduct: true,
          },
        },
      },
    });

    if (!bom) {
      throw new NotFoundException('BOM not found.');
    }

    return bom;
  }

  async findBoms(query: BomQueryDto, user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where = {
      isActive: true,

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                product: {
                  sku: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                product: {
                  name: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy =
      query.sortBy === 'finishedProduct'
        ? {
            product: {
              name: sortOrder,
            },
          }
        : query.sortBy === 'status'
          ? {
              isActive: sortOrder,
            }
          : {
              createdAt: sortOrder,
            };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.billOfMaterial.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          product: true,
          items: {
            include: {
              componentProduct: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      this.prisma.billOfMaterial.count({
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

  async createAssembly(dto: CreateAssemblyDto, user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessBranch(user, dto.branchId);

    return this.prisma.$transaction(
      async (tx) => {
        const branch = await tx.branch.findUnique({
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

        const bom = await tx.billOfMaterial.findUnique({
          where: {
            id: dto.billOfMaterialId,
          },
          include: {
            product: true,
            items: true,
          },
        });

        if (!bom) {
          throw new NotFoundException('BOM not found.');
        }

        if (!bom.isActive) {
          throw new BadRequestException('BOM is inactive.');
        }

        if (!bom.items.length) {
          throw new BadRequestException('BOM has no components.');
        }

        if (!bom.product.isActive) {
          throw new BadRequestException('Finished product is inactive.');
        }

        if (!bom.product.trackInventory) {
          throw new BadRequestException(
            'Finished product must track inventory.',
          );
        }

        const componentIds = bom.items.map((item) => item.componentProductId);

        const components = await tx.product.findMany({
          where: {
            id: {
              in: componentIds,
            },
          },
        });

        const componentMap = new Map(
          components.map((product) => [product.id, product]),
        );

        let totalAssemblyCost = new Prisma.Decimal(0);

        const componentResults: Array<{
          productId: string;
          quantityConsumed: number;
          unitCost: Prisma.Decimal;
          totalCost: Prisma.Decimal;
          newQuantity: number;
        }> = [];

        for (const bomItem of bom.items) {
          const product = componentMap.get(bomItem.componentProductId);

          if (!product) {
            throw new NotFoundException(
              `Component product ${bomItem.componentProductId} not found.`,
            );
          }

          if (!product.isActive) {
            throw new BadRequestException(
              `Component product ${product.sku} is inactive.`,
            );
          }

          if (!product.trackInventory) {
            throw new BadRequestException(
              `Component product ${product.sku} does not track inventory.`,
            );
          }

          const quantityConsumed = bomItem.quantity * dto.quantityProduced;

          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: dto.branchId,
                productId: product.id,
              },
            },
          });

          const currentQuantity = balance?.quantity ?? 0;
          const unitCost =
            balance?.averageCost ??
            product.defaultCostPrice ??
            new Prisma.Decimal(0);

          if (currentQuantity < quantityConsumed) {
            throw new BadRequestException(
              `Insufficient stock for ${product.sku}. Required: ${quantityConsumed}, Available: ${currentQuantity}.`,
            );
          }

          const totalCost = unitCost.mul(quantityConsumed);

          totalAssemblyCost = totalAssemblyCost.add(totalCost);

          componentResults.push({
            productId: product.id,
            quantityConsumed,
            unitCost,
            totalCost,
            newQuantity: currentQuantity - quantityConsumed,
          });
        }

        const finishedBalance = await tx.inventoryBalance.findUnique({
          where: {
            branchId_productId: {
              branchId: dto.branchId,
              productId: bom.productId,
            },
          },
        });

        const currentFinishedQuantity = finishedBalance?.quantity ?? 0;

        const assemblyUnitCost = totalAssemblyCost.div(dto.quantityProduced);

        const currentFinishedValue =
          finishedBalance?.averageCost?.mul(currentFinishedQuantity) ??
          new Prisma.Decimal(0);

        const producedValue = assemblyUnitCost.mul(dto.quantityProduced);

        const newFinishedQuantity =
          currentFinishedQuantity + dto.quantityProduced;

        const newFinishedAverageCost =
          newFinishedQuantity > 0
            ? currentFinishedValue.add(producedValue).div(newFinishedQuantity)
            : assemblyUnitCost;

        const assembly = await tx.assembly.create({
          data: {
            branchId: dto.branchId,
            billOfMaterialId: bom.id,
            finishedProductId: bom.productId,
            quantityProduced: dto.quantityProduced,
            status: AssemblyStatus.COMPLETED,
            notes: dto.notes,
            components: {
              create: componentResults.map((item) => ({
                componentProductId: item.productId,
                quantityConsumed: item.quantityConsumed,
              })),
            },
          },
          include: {
            branch: true,
            billOfMaterial: {
              include: {
                product: true,
              },
            },
            finishedProduct: true,
            components: {
              include: {
                componentProduct: true,
              },
            },
          },
        });

        for (const item of componentResults) {
          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_productId: {
                branchId: dto.branchId,
                productId: item.productId,
              },
            },
          });

          if (!balance) {
            throw new ConflictException(
              'Inventory changed during assembly. Please retry.',
            );
          }

          await tx.inventoryBalance.update({
            where: {
              id: balance.id,
            },
            data: {
              quantity: item.newQuantity,
              averageCost: item.unitCost,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              branchId: dto.branchId,
              productId: item.productId,
              type: InventoryMovementType.ASSEMBLY_CONSUMPTION,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              averageCostAfter: item.unitCost,
              quantityChange: -item.quantityConsumed,
              balanceAfter: item.newQuantity,
              referenceType: 'ASSEMBLY',
              referenceId: assembly.id,
              notes: dto.notes,
              createdById: user.id,
              assemblyId: assembly.id,
            },
          });
        }

        if (finishedBalance) {
          await tx.inventoryBalance.update({
            where: {
              id: finishedBalance.id,
            },
            data: {
              quantity: newFinishedQuantity,
              averageCost: newFinishedAverageCost,
            },
          });
        } else {
          await tx.inventoryBalance.create({
            data: {
              branchId: dto.branchId,
              productId: bom.productId,
              quantity: dto.quantityProduced,
              averageCost: assemblyUnitCost,
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            branchId: dto.branchId,
            productId: bom.productId,
            type: InventoryMovementType.ASSEMBLY_OUTPUT,
            unitCost: assemblyUnitCost,
            totalCost: producedValue,
            averageCostAfter: newFinishedAverageCost,
            quantityChange: dto.quantityProduced,
            balanceAfter: newFinishedQuantity,
            referenceType: 'ASSEMBLY',
            referenceId: assembly.id,
            notes: dto.notes,
            createdById: user.id,
            assemblyId: assembly.id,
          },
        });

        return assembly;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findAll(query: AssemblyQueryDto, user: AuthenticatedUser) {
    this.branchAccessService.assertCanAccessOptionalBranch(user, user.branchId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where = {
      ...(user.role === UserRole.ADMIN
        ? {}
        : {
            branchId: user.branchId!,
          }),
      ...(search
        ? {
            OR: [
              {
                finishedProduct: {
                  sku: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                finishedProduct: {
                  name: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy =
      query.sortBy === 'finishedProduct'
        ? {
            finishedProduct: {
              name: sortOrder,
            },
          }
        : query.sortBy === 'quantityProduced'
          ? {
              quantityProduced: sortOrder,
            }
          : query.sortBy === 'status'
            ? {
                status: sortOrder,
              }
            : {
                createdAt: sortOrder,
              };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assembly.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: true,

          billOfMaterial: {
            include: {
              product: true,
              items: {
                include: {
                  componentProduct: true,
                },
              },
            },
          },

          finishedProduct: true,

          components: {
            include: {
              componentProduct: true,
            },
          },

          inventoryMovements: true,
        },
      }),

      this.prisma.assembly.count({
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
    const assembly = await this.prisma.assembly.findUnique({
      where: { id },
      include: {
        branch: true,
        billOfMaterial: {
          include: {
            product: true,
            items: {
              include: {
                componentProduct: true,
              },
            },
          },
        },
        finishedProduct: true,
        components: {
          include: {
            componentProduct: true,
          },
        },
        inventoryMovements: true,
      },
    });

    if (!assembly) {
      throw new NotFoundException('Assembly not found.');
    }

    this.branchAccessService.assertCanAccessBranch(user, assembly.branchId);

    return assembly;
  }
}
