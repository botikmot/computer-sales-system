import type { Prisma } from '@computer-sales/database';

export type AccountsReceivableWithRelations =
  Prisma.AccountsReceivableGetPayload<{
    include: {
      branch: true;
      customer: true;
      salesInvoice: true;
    };
  }>;
