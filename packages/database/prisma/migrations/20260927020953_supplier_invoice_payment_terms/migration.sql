-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('COD', 'TERMS', 'CASH');

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'TERMS',
ADD COLUMN     "supplierInvoiceNo" TEXT;
