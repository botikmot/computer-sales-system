/*
  Warnings:

  - A unique constraint covering the columns `[salesReturnId]` on the table `CashBankTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SalesReturnStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesReturnSettlementMode" AS ENUM ('CASH_REFUND', 'AR_ADJUSTMENT', 'NO_REFUND');

-- AlterEnum
ALTER TYPE "CashBankTransactionType" ADD VALUE 'CUSTOMER_REFUND';

-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'SALES_RETURN';

-- AlterTable
ALTER TABLE "CashBankTransaction" ADD COLUMN     "salesReturnId" TEXT;

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "status" "SalesReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "settlementMode" "SalesReturnSettlementMode" NOT NULL DEFAULT 'NO_REFUND',
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "refundAccountId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnItem" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "salesInvoiceItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_returnNo_key" ON "SalesReturn"("returnNo");

-- CreateIndex
CREATE INDEX "SalesReturn_branchId_idx" ON "SalesReturn"("branchId");

-- CreateIndex
CREATE INDEX "SalesReturn_customerId_idx" ON "SalesReturn"("customerId");

-- CreateIndex
CREATE INDEX "SalesReturn_salesInvoiceId_idx" ON "SalesReturn"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "SalesReturn_status_idx" ON "SalesReturn"("status");

-- CreateIndex
CREATE INDEX "SalesReturn_returnDate_idx" ON "SalesReturn"("returnDate");

-- CreateIndex
CREATE INDEX "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");

-- CreateIndex
CREATE INDEX "SalesReturnItem_salesInvoiceItemId_idx" ON "SalesReturnItem"("salesInvoiceItemId");

-- CreateIndex
CREATE INDEX "SalesReturnItem_productId_idx" ON "SalesReturnItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturnItem_salesReturnId_salesInvoiceItemId_key" ON "SalesReturnItem"("salesReturnId", "salesInvoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CashBankTransaction_salesReturnId_key" ON "CashBankTransaction"("salesReturnId");

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_refundAccountId_fkey" FOREIGN KEY ("refundAccountId") REFERENCES "CashBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesInvoiceItemId_fkey" FOREIGN KEY ("salesInvoiceItemId") REFERENCES "SalesInvoiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
