-- AlterTable
ALTER TABLE "CashBankTransaction" ADD COLUMN     "accountId" TEXT;

-- CreateTable
CREATE TABLE "CashBankAccount" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "accountType" "CashBankAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashBankAccount_branchId_idx" ON "CashBankAccount"("branchId");

-- CreateIndex
CREATE INDEX "CashBankAccount_accountType_idx" ON "CashBankAccount"("accountType");

-- CreateIndex
CREATE INDEX "CashBankAccount_isActive_idx" ON "CashBankAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CashBankAccount_branchId_name_key" ON "CashBankAccount"("branchId", "name");

-- CreateIndex
CREATE INDEX "CashBankTransaction_accountId_idx" ON "CashBankTransaction"("accountId");

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBankAccount" ADD CONSTRAINT "CashBankAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
