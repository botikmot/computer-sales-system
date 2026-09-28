/*
  Warnings:

  - A unique constraint covering the columns `[pettyCashReplenishmentId]` on the table `CashBankTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CashBankTransaction" ADD COLUMN     "pettyCashReplenishmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CashBankTransaction_pettyCashReplenishmentId_key" ON "CashBankTransaction"("pettyCashReplenishmentId");

-- AddForeignKey
ALTER TABLE "CashBankTransaction" ADD CONSTRAINT "CashBankTransaction_pettyCashReplenishmentId_fkey" FOREIGN KEY ("pettyCashReplenishmentId") REFERENCES "PettyCashReplenishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
