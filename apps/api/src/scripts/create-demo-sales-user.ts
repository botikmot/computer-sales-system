import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@computer-sales/database';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const branchId = 'b36af62f-91e9-4737-b356-b5d3ea09c13a';

  await prisma.user.deleteMany({
    where: {
      username: 'sales001',
    },
  });

  const user = await prisma.user.create({
    data: {
      username: 'sales001',
      email: 'sales001@example.com',
      fullName: 'Demo Salesperson',
      passwordHash: 'TEMP-DEMO-HASH',
      role: 'SALES',
      status: 'ACTIVE',
      branchId,
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

  console.log(user);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
