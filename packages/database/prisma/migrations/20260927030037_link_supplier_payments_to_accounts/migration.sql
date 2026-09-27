-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "accountId" TEXT;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CashBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
