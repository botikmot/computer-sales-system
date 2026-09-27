-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashBankAccountType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "CashBankTransactionType" AS ENUM ('SUPPLIER_PAYMENT');

-- CreateEnum
CREATE TYPE "CashBankTransactionDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "accountsPayableId" TEXT NOT NULL,
    "accountType" "CashBankAccountType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,
    "notes" TEXT,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'POSTED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBankTransaction" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "supplierPaymentId" TEXT NOT NULL,
    "accountType" "CashBankAccountType" NOT NULL,
    "accountName" TEXT NOT NULL,
    "transactionType" "CashBankTransactionType" NOT NULL,
    "direction" "CashBankTransactionDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_paymentNo_key" ON "SupplierPayment"("paymentNo");

-- CreateIndex
CREATE INDEX "SupplierPayment_branchId_idx" ON "SupplierPayment"("branchId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_accountsPayableId_idx" ON "SupplierPayment"("accountsPayableId");

-- CreateIndex
CREATE INDEX "SupplierPayment_paymentDate_idx" ON "SupplierPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_status_idx" ON "SupplierPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CashBankTransaction_supplierPaymentId_key" ON "CashBankTransaction"("supplierPaymentId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_branchId_idx" ON "CashBankTransaction"("branchId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_accountType_idx" ON "CashBankTransaction"("accountType");

-- CreateIndex
CREATE INDEX "CashBankTransaction_transactionType_idx" ON "CashBankTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "CashBankTransaction_direction_idx" ON "CashBankTransaction"("direction");

-- CreateIndex
CREATE INDEX "CashBankTransaction_transactionDate_idx" ON "CashBankTransaction"("transactionDate");

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES "AccountsPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
