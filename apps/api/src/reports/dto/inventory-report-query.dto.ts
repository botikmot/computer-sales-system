import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  InventoryAdjustmentStatus,
  InventoryMovementType,
} from '@computer-sales/database';

export class InventoryReportQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;

  @IsOptional()
  @IsEnum(InventoryAdjustmentStatus)
  status?: InventoryAdjustmentStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threshold?: number;
}
