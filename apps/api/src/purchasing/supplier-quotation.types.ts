import type { Prisma } from '@computer-sales/database';

export type SupplierQuotationWithRelations =
  Prisma.SupplierQuotationGetPayload<{
    include: {
      branch: true;
      supplier: true;
      purchaseRequest: true;
      items: {
        include: {
          product: true;
        };
      };
    };
  }>;

export type SupplierQuotationRecord = Prisma.SupplierQuotationGetPayload<{}>;
