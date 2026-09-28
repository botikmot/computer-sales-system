-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankReconciliationItemType" AS ENUM ('OUTSTANDING_CHECK', 'DEPOSIT_IN_TRANSIT', 'BANK_CHARGE', 'BANK_CREDIT', 'OTHER');

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "reconciliationNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementEndingBalance" DECIMAL(12,2) NOT NULL,
    "bookBalance" DECIMAL(12,2) NOT NULL,
    "adjustedBankBalance" DECIMAL(12,2) NOT NULL,
    "adjustedBookBalance" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2) NOT NULL,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationItem" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "type" "BankReconciliationItemType" NOT NULL,
    "cashBankTransactionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_reconciliationNo_key" ON "BankReconciliation"("reconciliationNo");

-- CreateIndex
CREATE INDEX "BankReconciliation_branchId_idx" ON "BankReconciliation"("branchId");

-- CreateIndex
CREATE INDEX "BankReconciliation_accountId_idx" ON "BankReconciliation"("accountId");

-- CreateIndex
CREATE INDEX "BankReconciliation_statementDate_idx" ON "BankReconciliation"("statementDate");

-- CreateIndex
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_reconciliationId_idx" ON "BankReconciliationItem"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_cashBankTransactionId_idx" ON "BankReconciliationItem"("cashBankTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_type_idx" ON "BankReconciliationItem"("type");

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashBankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_cashBankTransactionId_fkey" FOREIGN KEY ("cashBankTransactionId") REFERENCES "CashBankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
