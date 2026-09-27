-- CreateEnum
CREATE TYPE "ReceivingCheckStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "Receiving" ADD COLUMN     "checkNotes" TEXT,
ADD COLUMN     "checkStatus" "ReceivingCheckStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedById" TEXT;

-- AlterTable
ALTER TABLE "ReceivingItem" ADD COLUMN     "qualityNotes" TEXT,
ADD COLUMN     "qualityStatus" TEXT,
ADD COLUMN     "quantityAccepted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityRejected" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Receiving" ADD CONSTRAINT "Receiving_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
