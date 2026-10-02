import type { Prisma } from '@computer-sales/database';

export type PurchaseRequestWithRelations = Prisma.PurchaseRequestGetPayload<{
  include: {
    branch: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type PurchaseRequestRecord = Prisma.PurchaseRequestGetPayload<{}>;

export type PurchaseRequestListResponse = {
  data: PurchaseRequestWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
