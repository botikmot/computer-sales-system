import type { Prisma } from '@computer-sales/database';

export type PurchaseInvoiceWithRelations = Prisma.PurchaseInvoiceGetPayload<{
  include: {
    branch: true;
    supplier: true;
    purchaseOrder: true;
    receiving: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type PurchaseInvoiceRecord = Prisma.PurchaseInvoiceGetPayload<{}>;
