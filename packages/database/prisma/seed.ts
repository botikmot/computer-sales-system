import "dotenv/config";

import * as bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedBootstrapAdmin() {
  const bootstrapAdminUsername =
    process.env.BOOTSTRAP_ADMIN_USERNAME?.trim() || "admin";

  const bootstrapAdminEmail =
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;

  const bootstrapAdminFullName =
    process.env.BOOTSTRAP_ADMIN_FULL_NAME?.trim() || "System Administrator";

  const bootstrapAdminPassword = getRequiredEnv("BOOTSTRAP_ADMIN_PASSWORD");

  if (bootstrapAdminPassword.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (existingAdmin) {
    console.log(`✅ Admin already exists: ${existingAdmin.username}`);

    return existingAdmin;
  }

  const existingUsername = await prisma.user.findUnique({
    where: {
      username: bootstrapAdminUsername,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  if (existingUsername) {
    throw new Error(
      `Cannot create bootstrap admin: username "${bootstrapAdminUsername}" already exists with role ${existingUsername.role}`,
    );
  }

  if (bootstrapAdminEmail) {
    const existingEmail = await prisma.user.findUnique({
      where: {
        email: bootstrapAdminEmail,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (existingEmail) {
      throw new Error(
        `Cannot create bootstrap admin: email "${bootstrapAdminEmail}" already exists`,
      );
    }
  }

  const passwordHash = await bcrypt.hash(bootstrapAdminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      username: bootstrapAdminUsername,
      email: bootstrapAdminEmail,
      fullName: bootstrapAdminFullName,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      branchId: null,
    },

    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      branchId: true,
      createdAt: true,
    },
  });

  console.log(`✅ Bootstrap admin created: ${admin.username}`);

  return admin;
}

async function main() {
  console.log("🌱 Starting database seed...");

  const mainBranch = await prisma.branch.upsert({
    where: {
      code: "MAIN",
    },
    update: {},
    create: {
      code: "MAIN",
      name: "Main Branch",
      address: "Demo Address",
      phone: "0000000000",
      email: "main@example.com",
      isActive: true,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: {
      code: "SUP-001",
    },
    update: {},
    create: {
      code: "SUP-001",
      name: "Demo Computer Supplier",
      contactPerson: "Juan Supplier",
      contactNumber: "09170000000",
      email: "supplier@example.com",
      address: "Demo Supplier Address",
      isActive: true,
    },
  });

  const processors = await prisma.productCategory.upsert({
    where: {
      name: "Processors",
    },
    update: {},
    create: {
      name: "Processors",
    },
  });

  const memory = await prisma.productCategory.upsert({
    where: {
      name: "Memory",
    },
    update: {},
    create: {
      name: "Memory",
    },
  });

  const storage = await prisma.productCategory.upsert({
    where: {
      name: "Storage",
    },
    update: {},
    create: {
      name: "Storage",
    },
  });

  const motherboards = await prisma.productCategory.upsert({
    where: {
      name: "Motherboards",
    },
    update: {},
    create: {
      name: "Motherboards",
    },
  });

  const psu = await prisma.productCategory.upsert({
    where: {
      name: "Power Supplies",
    },
    update: {},
    create: {
      name: "Power Supplies",
    },
  });

  const products = [
    {
      sku: "CPU-R5-5600",
      name: "AMD Ryzen 5 5600",
      brand: "AMD",
      model: "Ryzen 5 5600",
      categoryId: processors.id,
      defaultCostPrice: 5000,
      defaultSellingPrice: 6500,
    },
    {
      sku: "RAM-DDR4-16",
      name: "16GB DDR4 RAM",
      brand: "Generic",
      model: "DDR4 3200",
      categoryId: memory.id,
      defaultCostPrice: 1800,
      defaultSellingPrice: 2300,
    },
    {
      sku: "SSD-500-NVME",
      name: "500GB NVMe SSD",
      brand: "Generic",
      model: "NVMe 500GB",
      categoryId: storage.id,
      defaultCostPrice: 2200,
      defaultSellingPrice: 2800,
    },
    {
      sku: "MB-AM4-B550",
      name: "B550 Motherboard",
      brand: "Generic",
      model: "B550",
      categoryId: motherboards.id,
      defaultCostPrice: 4500,
      defaultSellingPrice: 5600,
    },
    {
      sku: "PSU-650-BR",
      name: "650W Power Supply",
      brand: "Generic",
      model: "650W Bronze",
      categoryId: psu.id,
      defaultCostPrice: 2500,
      defaultSellingPrice: 3200,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        name: product.name,
        brand: product.brand,
        model: product.model,
        categoryId: product.categoryId,
        defaultCostPrice: product.defaultCostPrice,
        defaultSellingPrice: product.defaultSellingPrice,
        isActive: true,
      },
      create: {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        model: product.model,
        categoryId: product.categoryId,
        defaultCostPrice: product.defaultCostPrice,
        defaultSellingPrice: product.defaultSellingPrice,
        isActive: true,
        trackInventory: true,
      },
    });
  }

  await seedBootstrapAdmin();

  console.log(`✅ Branch ready: ${mainBranch.code}`);
  console.log(`✅ Products seeded: ${products.length}`);
  console.log(`✅ Supplier ready: ${supplier.code}`);
  console.log("🌱 Database seed completed.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
