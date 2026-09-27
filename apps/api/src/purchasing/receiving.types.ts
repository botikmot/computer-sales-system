import type { Prisma } from '@computer-sales/database';

export type ReceivingWithRelations = Prisma.ReceivingGetPayload<{
  include: {
    branch: true;
    purchaseOrder: {
      include: {
        supplier: true;
      };
    };
    items: {
      include: {
        product: true;
        purchaseOrderItem: true;
      };
    };
  };
}>;

export type ReceivingRecord = Prisma.ReceivingGetPayload<{}>;
