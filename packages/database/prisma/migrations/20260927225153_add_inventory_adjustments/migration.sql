-- CreateEnum
CREATE TYPE "InventoryAdjustmentStatus" AS ENUM ('DRAFT', 'COUNTED', 'FOR_APPROVAL', 'CONFIRMED', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "adjustmentNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "InventoryAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "adjustmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustmentItem" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAdjustmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAdjustment_adjustmentNo_key" ON "InventoryAdjustment"("adjustmentNo");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_branchId_idx" ON "InventoryAdjustment"("branchId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_status_idx" ON "InventoryAdjustment"("status");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_adjustmentDate_idx" ON "InventoryAdjustment"("adjustmentDate");

-- CreateIndex
CREATE INDEX "InventoryAdjustmentItem_adjustmentId_idx" ON "InventoryAdjustmentItem"("adjustmentId");

-- CreateIndex
CREATE INDEX "InventoryAdjustmentItem_productId_idx" ON "InventoryAdjustmentItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAdjustmentItem_adjustmentId_productId_key" ON "InventoryAdjustmentItem"("adjustmentId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustmentItem" ADD CONSTRAINT "InventoryAdjustmentItem_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InventoryAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustmentItem" ADD CONSTRAINT "InventoryAdjustmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
