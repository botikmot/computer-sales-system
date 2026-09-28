-- CreateEnum
CREATE TYPE "PettyCashFundStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PettyCashVoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PettyCashReplenishmentStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PettyCashTransactionType" AS ENUM ('EXPENSE', 'REPLENISHMENT');

-- AlterEnum
ALTER TYPE "CashBankTransactionType" ADD VALUE 'PETTY_CASH_REPLENISHMENT';

-- CreateTable
CREATE TABLE "PettyCashFund" (
    "id" TEXT NOT NULL,
    "fundNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "custodianId" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PettyCashFundStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL,
    "payee" TEXT,
    "referenceNo" TEXT,
    "status" "PettyCashVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashReplenishment" (
    "id" TEXT NOT NULL,
    "replenishmentNo" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "replenishmentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PettyCashReplenishmentStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCashReplenishment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashFund_fundNo_key" ON "PettyCashFund"("fundNo");

-- CreateIndex
CREATE INDEX "PettyCashFund_branchId_idx" ON "PettyCashFund"("branchId");

-- CreateIndex
CREATE INDEX "PettyCashFund_custodianId_idx" ON "PettyCashFund"("custodianId");

-- CreateIndex
CREATE INDEX "PettyCashFund_status_idx" ON "PettyCashFund"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashVoucher_voucherNo_key" ON "PettyCashVoucher"("voucherNo");

-- CreateIndex
CREATE INDEX "PettyCashVoucher_fundId_idx" ON "PettyCashVoucher"("fundId");

-- CreateIndex
CREATE INDEX "PettyCashVoucher_expenseDate_idx" ON "PettyCashVoucher"("expenseDate");

-- CreateIndex
CREATE INDEX "PettyCashVoucher_status_idx" ON "PettyCashVoucher"("status");

-- CreateIndex
CREATE INDEX "PettyCashVoucher_category_idx" ON "PettyCashVoucher"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashReplenishment_replenishmentNo_key" ON "PettyCashReplenishment"("replenishmentNo");

-- CreateIndex
CREATE INDEX "PettyCashReplenishment_fundId_idx" ON "PettyCashReplenishment"("fundId");

-- CreateIndex
CREATE INDEX "PettyCashReplenishment_accountId_idx" ON "PettyCashReplenishment"("accountId");

-- CreateIndex
CREATE INDEX "PettyCashReplenishment_replenishmentDate_idx" ON "PettyCashReplenishment"("replenishmentDate");

-- CreateIndex
CREATE INDEX "PettyCashReplenishment_status_idx" ON "PettyCashReplenishment"("status");

-- AddForeignKey
ALTER TABLE "PettyCashFund" ADD CONSTRAINT "PettyCashFund_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashFund" ADD CONSTRAINT "PettyCashFund_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashFund" ADD CONSTRAINT "PettyCashFund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "PettyCashFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashReplenishment" ADD CONSTRAINT "PettyCashReplenishment_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "PettyCashFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashReplenishment" ADD CONSTRAINT "PettyCashReplenishment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashReplenishment" ADD CONSTRAINT "PettyCashReplenishment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
