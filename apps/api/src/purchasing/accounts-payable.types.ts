import type { Prisma } from '@computer-sales/database';

export type AccountsPayableWithRelations = Prisma.AccountsPayableGetPayload<{
  include: {
    branch: true;
    supplier: true;
    purchaseInvoice: true;
  };
}>;

export type AccountsPayableRecord = Prisma.AccountsPayableGetPayload<{}>;
