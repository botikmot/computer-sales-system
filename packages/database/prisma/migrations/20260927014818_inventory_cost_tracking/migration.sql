-- AlterTable
ALTER TABLE "InventoryBalance" ADD COLUMN     "averageCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "averageCostAfter" DECIMAL(12,2),
ADD COLUMN     "totalCost" DECIMAL(12,2),
ADD COLUMN     "unitCost" DECIMAL(12,2);
