import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryAdjustmentCountItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(0)
  countedQuantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CountInventoryAdjustmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryAdjustmentCountItemDto)
  items!: InventoryAdjustmentCountItemDto[];
}
