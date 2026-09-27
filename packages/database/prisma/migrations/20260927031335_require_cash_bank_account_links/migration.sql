/*
  Warnings:

  - Made the column `accountId` on table `CashBankTransaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `accountId` on table `SupplierPayment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CashBankTransaction" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SupplierPayment" ALTER COLUMN "accountId" SET NOT NULL;
