import type { Prisma } from '@computer-sales/database';

export type PaymentVoucherWithRelations = Prisma.PaymentVoucherGetPayload<{
  include: {
    branch: true;
    supplierPayment: {
      include: {
        supplier: true;
        accountsPayable: true;
        account: true;
      };
    };
  };
}>;
