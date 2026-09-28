/*
  Warnings:

  - A unique constraint covering the columns `[serviceInvoiceId]` on the table `AccountsReceivable` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ServiceInvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServicePaymentMode" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "ServiceJobStatus" AS ENUM ('DRAFT', 'DIAGNOSING', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'READY_FOR_RELEASE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceInvoiceItemType" AS ENUM ('LABOR', 'PART', 'OTHER');

-- AlterTable
ALTER TABLE "AccountsReceivable" ADD COLUMN     "serviceInvoiceId" TEXT,
ALTER COLUMN "salesInvoiceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CustomerPayment" ADD COLUMN     "serviceInvoiceId" TEXT,
ALTER COLUMN "salesInvoiceId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ServiceInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceJobId" TEXT NOT NULL,
    "status" "ServiceInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentMode" "ServicePaymentMode" NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJob" (
    "id" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "status" "ServiceJobStatus" NOT NULL DEFAULT 'DRAFT',
    "diagnosticFindings" TEXT,
    "laborCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customerApproved" BOOLEAN NOT NULL DEFAULT false,
    "customerApprovedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobPart" (
    "id" TEXT NOT NULL,
    "serviceJobId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requiredQuantity" INTEGER NOT NULL,
    "issuedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ServiceJobPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceInvoiceItem" (
    "id" TEXT NOT NULL,
    "serviceInvoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "itemType" "ServiceInvoiceItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ServiceInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoice_invoiceNo_key" ON "ServiceInvoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInvoice_serviceJobId_key" ON "ServiceInvoice"("serviceJobId");

-- CreateIndex
CREATE INDEX "ServiceInvoice_branchId_idx" ON "ServiceInvoice"("branchId");

-- CreateIndex
CREATE INDEX "ServiceInvoice_customerId_idx" ON "ServiceInvoice"("customerId");

-- CreateIndex
CREATE INDEX "ServiceInvoice_status_idx" ON "ServiceInvoice"("status");

-- CreateIndex
CREATE INDEX "ServiceInvoice_paymentMode_idx" ON "ServiceInvoice"("paymentMode");

-- CreateIndex
CREATE INDEX "ServiceInvoice_invoiceDate_idx" ON "ServiceInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "ServiceInvoice_dueDate_idx" ON "ServiceInvoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_jobNo_key" ON "ServiceJob"("jobNo");

-- CreateIndex
CREATE INDEX "ServiceJob_branchId_idx" ON "ServiceJob"("branchId");

-- CreateIndex
CREATE INDEX "ServiceJob_customerId_idx" ON "ServiceJob"("customerId");

-- CreateIndex
CREATE INDEX "ServiceJob_technicianId_idx" ON "ServiceJob"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceJob_status_idx" ON "ServiceJob"("status");

-- CreateIndex
CREATE INDEX "ServiceJob_createdAt_idx" ON "ServiceJob"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceJobPart_productId_idx" ON "ServiceJobPart"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJobPart_serviceJobId_productId_key" ON "ServiceJobPart"("serviceJobId", "productId");

-- CreateIndex
CREATE INDEX "ServiceInvoiceItem_serviceInvoiceId_idx" ON "ServiceInvoiceItem"("serviceInvoiceId");

-- CreateIndex
CREATE INDEX "ServiceInvoiceItem_productId_idx" ON "ServiceInvoiceItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_serviceInvoiceId_key" ON "AccountsReceivable"("serviceInvoiceId");

-- CreateIndex
CREATE INDEX "AccountsReceivable_salesInvoiceId_idx" ON "AccountsReceivable"("salesInvoiceId");

-- CreateIndex
CREATE INDEX "AccountsReceivable_serviceInvoiceId_idx" ON "AccountsReceivable"("serviceInvoiceId");

-- CreateIndex
CREATE INDEX "CustomerPayment_serviceInvoiceId_idx" ON "CustomerPayment"("serviceInvoiceId");

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_serviceInvoiceId_fkey" FOREIGN KEY ("serviceInvoiceId") REFERENCES "ServiceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_serviceInvoiceId_fkey" FOREIGN KEY ("serviceInvoiceId") REFERENCES "ServiceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoice" ADD CONSTRAINT "ServiceInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoice" ADD CONSTRAINT "ServiceInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoice" ADD CONSTRAINT "ServiceInvoice_serviceJobId_fkey" FOREIGN KEY ("serviceJobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoice" ADD CONSTRAINT "ServiceInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobPart" ADD CONSTRAINT "ServiceJobPart_serviceJobId_fkey" FOREIGN KEY ("serviceJobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobPart" ADD CONSTRAINT "ServiceJobPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoiceItem" ADD CONSTRAINT "ServiceInvoiceItem_serviceInvoiceId_fkey" FOREIGN KEY ("serviceInvoiceId") REFERENCES "ServiceInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInvoiceItem" ADD CONSTRAINT "ServiceInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
