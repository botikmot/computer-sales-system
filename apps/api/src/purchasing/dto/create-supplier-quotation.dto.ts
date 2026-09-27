import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SupplierQuotationItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number;
}

export class CreateSupplierQuotationDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  supplierId!: string;

  @IsUUID()
  purchaseRequestId!: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => SupplierQuotationItemDto)
  @ArrayMinSize(1)
  items!: SupplierQuotationItemDto[];
}
