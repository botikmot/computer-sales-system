import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

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

  console.log(`✅ Branch ready: ${mainBranch.code}`);
  console.log(`✅ Products seeded: ${products.length}`);
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
