import type { Prisma } from '@computer-sales/database';

export type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    branch: true;
    supplier: true;
    purchaseRequest: true;
    supplierQuotation: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type PurchaseOrderRecord = Prisma.PurchaseOrderGetPayload<{}>;
